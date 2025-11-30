const mangayomiSources = [
	{
		"name": "PeliCineHD",
		"lang": "es",
		"baseUrl": "https://pelicinehd.com",
		"apiUrl": "",
		"iconUrl": "https://pelicinehd.com/wp-content/uploads/2023/10/cropped-pngwing.com_-4-192x192.png",
		"typeSource": "single",
		"itemType": 1,
		"version": "1.0.5",
		"dateFormat": "",
		"dateFormatLocale": "",
		"pkgPath": "anime/src/es/pelicinehd.js"
	}
];

class DefaultExtension extends MProvider {
	async requestGet(url) {
		const DOMAIN = 'https://pelicinehd.com/'

		try {
			const assembleURL = absUrl(url, DOMAIN);

			return await new Client({ 'useDartHttpClient': true }).get(assembleURL);
		} catch (error) {
			console.log(`Error en requestGet: ${error}`)
		}
	}

	async requestPost(postID, season) {
		const DOMAIN = 'https://pelicinehd.com/'

		try {
			return await new Client({ 'useDartHttpClient': true }).post('https://pelicinehd.com/wp-admin/admin-ajax.php',
				{ "Referer": DOMAIN }, 
				{ 
					'action': 'action_select_season',
					'season': season,
					'post': postID
				}
			);
		} catch (error) {
			console.log(`Error en requestPost: ${error}`)
		}
	}

	async getPopular(page) {
		return await this.search(false, page, false, `/peliculas/page/${page}/`);
	}

	async getLatestUpdates(page) {
		return await this.search(false, page, false, `/release/2025/page/${page}/`);
	}

	async search(query, page, filters, special) {
		let searchUrl = special || `/page/${page}/?s=${encodeURIComponent(query)}`

		if (query) {
			searchUrl = `/page/${page}/?s=${encodeURIComponent(query)}`
		} else if (filters) {
			filters.forEach(item => {
				if (item.state !== 0) {
					if (item.type === 'GenreFilter'){
						searchUrl = `/category/${item.values[item.state].value}/page/${page}/`
					} else if (item.type === 'YearFilter' && item.state !== ''){
						searchUrl = `/release/${item.state}/page/${page}/`
					}
				}
			});
		}

		const searchRes = await this.requestGet(searchUrl);
		const searchHtml = new Document(searchRes.body);

		const movies = [];
		const nextPage = searchHtml.selectFirst('.nav-links > a:last-child').text === "SIGUIENTE";
		searchHtml.select('article[class*=movie]').map(item => {
			const title = item.selectFirst('h2.entry-title').text;
			const cover = item.selectFirst('img').getSrc;
			const _link = item.selectFirst('a').getHref;

			movies.push({
				name: title,
				imageUrl: absUrl(cover, 'https:/'),
				link: _link
			})
		})

		return {
			list: movies,
			hasNextPage: nextPage
		}
	}

	async getDetail(url) {
		try {
			// Obtener la respuesta de la url
			const detailRes = await this.requestGet(url);
			const detailHtml = new Document(detailRes.body);

			// Funciones auxiliares para extraer datos
			const extractText = (selector) => detailHtml.selectFirst(selector)?.text || '';
			const extractAttr = (selector, attr) => detailHtml.selectFirst(selector)?.attr(attr) || '';

			// Extraer datos básicos
			const title = extractText('h1.entry-title');
			const cover = extractAttr('img[alt*=Image]', 'src');
			const description = extractText('.description');
			const director = extractText('a[href*=director]');
			const artistas = detailHtml.select('a[href*=cast]').map(artist => artist.text);
			const status = this.parseStatus(url);
			const year = extractText('span.fa-calendar')
			const genres = detailHtml.select('.genres > a').map(genre => genre.text);

			// Manejo de episodios
			let episodes = [];
			if (status === 1) { // Caso de película
				episodes.push({
					name: `Ver Película`,
					url: url,
					dateUpload: String(new Date(year).valueOf()),
				});
			} else { // Caso de serie con temporadas
				const seasons = detailHtml.select('ul.aa-cnt > li').map(key => ({
					'data-post': key.selectFirst('a').attr('data-post'),
					'data-season': key.selectFirst('a').attr('data-season')
				}));

				for (const [seasonIndex, season] of seasons.entries()) {
					const html = await this.requestPost(season['data-post'], season['data-season']);
					const episodeHtml = new Document(html.body);
					const episodeItems = episodeHtml.select('li');

					let countEpisode = 1;
					for (const item of episodeItems) {
						const episodeTitle = item.selectFirst('h2.entry-title')?.text || '';
						const episodeImage = item.selectFirst('img').attr('src')
						const episodeUrl = item.selectFirst('a.lnk-blk')?.attr('href') || '';
						if (episodeTitle && episodeUrl) {
							const episodeName = episodeTitle.trim().replace(/\d+x\d+/g, '');
							episodes.push({
								name: `T${seasonIndex + 1}:E${countEpisode++} - ${episodeName}`,
								url: episodeUrl.trim(),
								dateUpload: String(new Date().valueOf())
							});
						}
					}
				}
			}

			// Retornar objeto con datos procesados
			return {
				name: title,
				link: url,
				imageUrl: `https:${cover.replace('w185', 'w780')}`,
				description: description.trim(),
				author: director,
				artist: artistas.join(', '),
				status: status,
				genre: genres,
				episodes: episodes
			};
		} catch (error) {
			throw new Error(error);
		}
	}

	// For anime episode video list
	async getVideoList(url) {
		try {
			const response = await this.requestGet(url);
			const videoHtml = new Document(response.body); // Ensure Document is properly defined (e.g., via jsdom)
			const trtype = this.parseStatus(url) === 1 ? 1 : 2;

			const langLUT = {
				'LATÍNO': 'Latino',
				'CASTELLANO': 'Español',
				'SUBTITULADO': 'VOSE',
			};
			const renameLUT = {
				'Fastream': 'Fastream',
				'Ryderjet': 'VidHide',
				'Vidhidefast': 'VidHide',
				'Dhtpre': 'VidHide',
				'Peytonepre':'VidHide',
				'Dintezuvio': 'VidHide',
				'Ghbrisk': 'StreamWish',
				'playerwish': 'StreamWish',
				'listeamed': 'VidGuard'
			};

			let count = 0;
			const trid = videoHtml.selectFirst('body')?.attr('class').match(/(term-|postid-)\d+/)?.[0].split('-')[1];
			const videoMap = await Promise.allSettled(videoHtml.select('span.server').map(async key => {
				const nameParts = key.text.trim().split('-');
				const serverName = nameParts[0]?.trim() || 'UqLoad';
				const language = nameParts[1]?.split(' ')[0]?.trim() || 'Unknown';

				const htmlRes = await this.requestGet(`https://pelicinehd.com/?trembed=${count++}&trid=${trid}&trtype=${trtype}`);
				const serverUrlMatch = htmlRes.body.match(/src="(.*?)"/i);
				const serverUrl = serverUrlMatch?.[1];
				const method = renameLUT[serverName] || serverName
				const isLand = langLUT[language] || language

				return extractAny(serverUrl, method, isLand, method)
			}));

			const videos = videoMap.filter(p => p.status === 'fulfilled' && p.value).flatMap(p => p.value);

			return sortVideos(videos);
		} catch (error) {
			throw new Error(error);
		}
	}

	parseStatus(statusString) {
		if (statusString.includes("En emision")) {
			return 0;
		} else if (statusString.includes("/movies/")) {
			return 1;
		} else {
			return 5;
		}
	}

	getFilterList() {
		return [
			{
				type_name: "HeaderFilter",
				name: "El filtro se ignora cuando se utiliza la búsqueda de texto.",
				type: "Header"
			},
			{
				type: "GenreFilter",
				name: "Genero",
				type_name: "SelectFilter",
				values: [
					{ name: "Default", value: "", type_name: "SelectOption" },
					{ name: "Ciencia Ficcion", value: "ciencia-ficcion", type_name: "SelectOption" },
					{ name: "Animacion", value: "animacion", type_name: "SelectOption" },
					{ name: "Drama", value: "drama", type_name: "SelectOption" },
					{ name: "Terror", value: "terror", type_name: "SelectOption" },
					{ name: "Familia", value: "familia", type_name: "SelectOption" },
					{ name: "Fantasia", value: "fantasia", type_name: "SelectOption" },
					{ name: "Crimen", value: "crimen", type_name: "SelectOption" },
					{ name: "Accion", value: "accion", type_name: "SelectOption" },
					{ name: "Aventura", value: "aventura", type_name: "SelectOption" },
					{ name: "Suspense", value: "suspense", type_name: "SelectOption" },
					{ name: "Comedia", value: "comedia", type_name: "SelectOption" },
					{ name: "Kids", value: "kids", type_name: "SelectOption" },
					{ name: "Misterio", value: "misterio", type_name: "SelectOption" },
					{ name: "Romance", value: "romance", type_name: "SelectOption" }
				]
			},
			{
				type_name: "HeaderFilter",
				name: "Busqueda por año, ejemplo: 2025",
				type: "Hearder"
			},
			{
				type: "YearFilter",
				name: "Año",
				type_name: "TextFilter"
			}
		];
	}

	getSourcePreferences() {
		const languages = ['Latino', 'Español', 'VOSE'];
		const resolutions = ['1080p', '720p', '480p'];
		const hosts = [
			"StreamWish",
			"DoodStream",
			"FileMoon",
			"Fastream",
			"VidHide",
			"UqLoad",
			"Okru",
			"Voe",
		];

		return [
			{
				key: 'pref_language',
				listPreference: {
					title: 'Preferred Language',
					summary: 'Si está disponible, este idioma se elegirá por defecto. Prioridad = 0',
					valueIndex: 0,
					entries: languages,
					entryValues: languages
				}
			},
			{
				key: 'pref_resolution',
				listPreference: {
					title: 'Preferred Resolution',
					summary: 'Si está disponible, se elegirá esta resolución por defecto. Prioridad = 1',
					valueIndex: 0,
					entries: resolutions,
					entryValues: resolutions
				}
			},
			{
				key: 'pref_host',
				listPreference: {
					title: 'Preferred Host',
					summary: 'Si está disponible, este host será elegido por defecto. Prioridad = 2',
					valueIndex: 0,
					entries: hosts,
					entryValues: hosts
				}
			}
		];
	}
}

/***************************************************************************************************
* 
*   mangayomi-js-helpers (Editado con solo lo que esta extencion nesecita)
*       
*   # Video Extractors
*       - doodExtractor
*       - okruExtractor
*       - vidHideExtractor
*       - filemoonExtractor
*       - uqLoadExtractor
*   
*   # Video Extractor Wrappers
*       - streamWishExtractor
*       - voeExtractor
*   
*   # Video Extractor helpers
*       - extractAny
*   
*   # Playlist Extractors
*       - m3u8Extractor
*       - jwplayerExtractor
*   
*   # Extension Helpers
*       - sortVideos() - modificada para funcionar correctamente
*   
*   # String
*       - getRandomString()
*   
*   # Url
*       - absUrl()
*
***************************************************************************************************/

//--------------------------------------------------------------------------------------------------
//  Video Extractors
//--------------------------------------------------------------------------------------------------

async function doodExtractor(url) {
	const dartClient = new Client({ 'useDartHttpClient': true, "followRedirects": false });
	let response = await dartClient.get(url);
	while ("location" in response.headers) {
		response = await dartClient.get(response.headers.location);
	}
	const newUrl = response.request.url;
	const doodhost = newUrl.match(/https:\/\/(.*?)\//, newUrl)[0].slice(8, -1);
	const md5 = response.body.match(/'\/pass_md5\/(.*?)',/, newUrl)[0].slice(11, -2);
	const token = md5.substring(md5.lastIndexOf("/") + 1);
	const expiry = new Date().valueOf();
	const randomString = getRandomString(10);

	response = await new Client().get(`https://${doodhost}/pass_md5/${md5}`, { "Referer": newUrl });
	const videoUrl = `${response.body}${randomString}?token=${token}&expiry=${expiry}`;
	const headers = { "User-Agent": "Mangayomi", "Referer": doodhost };
	return [{ url: videoUrl, originalUrl: videoUrl, headers: headers, quality: '' }];
}

async function okruExtractor(url) {
	const res = await new Client().get(url);
	const doc = new Document(res.body);
	const tag = doc.selectFirst('div[data-options]');
	const playlistUrl = tag.attr('data-options').match(/hlsManifestUrl.*?(h.*?id=\d+)/)[1].replaceAll('\\\\u0026', '&');
	return await m3u8Extractor(playlistUrl, null);
}

async function filemoonExtractor(url, headers) {
	headers = headers ?? {};
	headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
	delete headers['user-agent'];

	let res = await new Client().get(url, headers);
	const src = res.body.match(/iframe src="(.*?)"/)?.[1];
	if (src) {
		res = await new Client().get(src, {
			'Referer': url,
			'Accept-Language': 'de,en-US;q=0.7,en;q=0.3',
			'User-Agent': headers['User-Agent']
		});
	}
	return await jwplayerExtractor(res.body, headers);
}

async function uqLoadExtractor(url) {
	const res = await new Client().get(url);
	const videoUrl = res.body.match(/sources: \["(.*?)"/)?.[1];
	return videoUrl ? [{ url: videoUrl, originalUrl: videoUrl, headers: null, quality: '' }] : [];
}

async function streamHideExtractor(url) {
	const dartClient = new Client({ 'useDartHttpClient': true, "followRedirects": false })
	const URLsplit = url.split('/')
	const headers = {
		'Referer': url,
		'verifypeer': false,
		'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:71.0) Gecko/20100101 Firefox/77.0'
	}

	try {
		// Fetch HTML
		const response = await dartClient.get(url, headers);

		// Unpack obfuscated JS
		const unpacked = unpackJs(response.body);
		if (!unpacked) throw new Error("Failed to unpack JavaScript.");

		// Extract and parse links
		const linksMatch = unpacked.substringBetween('links={', '}');
		if (!linksMatch) throw new Error("No links found in unpacked JavaScript.");

		let arrayLinks;
		try {
			arrayLinks = JSON.parse(`{${linksMatch}}`);
		} catch (e) {
			throw new Error("Failed to parse links JSON.");
		}

		// Process links
		const videos = [];
		for (let link of Object.values(arrayLinks)) {
			if (typeof link !== 'string') continue;

			if (link.includes('master.m3u8')) {
				try {
					if (link.startsWith('/stream/')) {
						link = `https://${URLsplit[2] + link}`
					}
					const extracted = await m3u8Extractor(link, headers);
					videos.push(...extracted);
				} catch (e) {
					console.error(`Failed to extract m3u8: ${link}`, e);
				}
			} else {
				videos.push({
					url: link,
					originalUrl: link,
					quality: '',
					headers: headers
				});
			}
		}
		return videos;
	} catch (error) {
		console.error(`Error in streamHideExtractor: ${error}`);
		return [];
	}
}

async function fastreamExtractor(url) {
	const dartClient = new Client({ 'useDartHttpClient': true, "followRedirects": true })
	const headers = {
		'Referer': url,
		'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:71.0) Gecko/20100101 Firefox/77.0'
	}

	try {
		const response = await dartClient.get(url, headers)
		return await jwplayerExtractor(response.body, headers);
	} catch (error) {
		console.error("Error in fastreamExtractor: " + error);
		return [];
	}
}

//--------------------------------------------------------------------------------------------------
//  Video Extractor Wrappers
//--------------------------------------------------------------------------------------------------

//_streamWishExtractor = streamWishExtractor;
//streamWishExtractor = async (url) => {
//	return (await _streamWishExtractor(url, '')).map(v => {
//		v.quality = v.quality.slice(3, -1);
//		return v;
//	});
//}

//_voeExtractor = voeExtractor;
//voeExtractor = async (url) => {
//	return (await _voeExtractor(url, '')).map(v => {
//		v.quality = v.quality.replace(/Voe: (\d+p?)/i, '$1');
//		return v;
//	});
//}

//--------------------------------------------------------------------------------------------------
//  Video Extractor Helpers
//--------------------------------------------------------------------------------------------------

async function extractAny(url, method, lang, host, headers = null) {
	const m = extractAny.methods[method.toLowerCase()];
	return (!m) ? [] : (await m(url, headers)).map(v => {
		v.quality = v.quality ? `${lang} ${host}: ${v.quality}` : `${lang} ${host}`;
		return v;
	});
};

extractAny.methods = {
	'uqload': uqLoadExtractor,
	'fastream': fastreamExtractor,
	'doodstream': doodExtractor,
	'filemoon': filemoonExtractor,
	'okru': okruExtractor,
	'streamwish': streamHideExtractor,
	'vidhide': streamHideExtractor,
	'voe': voeExtractor
};

//--------------------------------------------------------------------------------------------------
//  Playlist Extractors
//--------------------------------------------------------------------------------------------------

async function m3u8Extractor(url, headers = null) {
	// https://developer.apple.com/documentation/http-live-streaming/creating-a-multivariant-playlist
	// https://developer.apple.com/documentation/http-live-streaming/adding-alternate-media-to-a-playlist
	// define attribute lists
	const streamAttributes = [
		['avg_bandwidth', /AVERAGE-BANDWIDTH=(\d+)/],
		['bandwidth', /\bBANDWIDTH=(\d+)/],
		['resolution', /\bRESOLUTION=([\dx]+)/],
		['framerate', /\bFRAME-RATE=([\d\.]+)/],
		['codecs', /\bCODECS="(.*?)"/],
		['video', /\bVIDEO="(.*?)"/],
		['audio', /\bAUDIO="(.*?)"/],
		['subtitles', /\bSUBTITLES="(.*?)"/],
		['captions', /\bCLOSED-CAPTIONS="(.*?)"/]
	];
	const mediaAttributes = [
		['type', /\bTYPE=([\w-]*)/],
		['group', /\bGROUP-ID="(.*?)"/],
		['lang', /\bLANGUAGE="(.*?)"/],
		['name', /\bNAME="(.*?)"/],
		['autoselect', /\bAUTOSELECT=(\w*)/],
		['default', /\bDEFAULT=(\w*)/],
		['instream-id', /\bINSTREAM-ID="(.*?)"/],
		['assoc-lang', /\bASSOC-LANGUAGE="(.*?)"/],
		['channels', /\bCHANNELS="(.*?)"/],
		['uri', /\bURI="(.*?)"/]
	];
	const streams = [], videos = {}, audios = {}, subtitles = {}, captions = {};
	const dict = { 'VIDEO': videos, 'AUDIO': audios, 'SUBTITLES': subtitles, 'CLOSED-CAPTIONS': captions };

	const res = await new Client().get(url, headers);
	const text = res.body;

	if (res.statusCode != 200) {
		return [];
	}

	// collect media
	for (const match of text.matchAll(/#EXT-X-MEDIA:(.*)/g)) {
		const info = match[1], medium = {};
		for (const attr of mediaAttributes) {
			const m = info.match(attr[1]);
			medium[attr[0]] = m ? m[1] : null;
		}

		const type = medium.type;
		delete medium.type;
		const group = medium.group;
		delete medium.group;

		const typedict = dict[type];
		if (typedict[group] == undefined)
			typedict[group] = [];
		typedict[group].push(medium);
	}

	// collect streams
	for (const match of text.matchAll(/#EXT-X-STREAM-INF:(.*)\s*(.*)/g)) {
		const info = match[1], stream = { 'url': absUrl(match[2], url) };
		for (const attr of streamAttributes) {
			const m = info.match(attr[1]);
			stream[attr[0]] = m ? m[1] : null;
		}

		stream['video'] = videos[stream.video] ?? null;
		stream['audio'] = audios[stream.audio] ?? null;
		stream['subtitles'] = subtitles[stream.subtitles] ?? null;
		stream['captions'] = captions[stream.captions] ?? null;

		// format resolution or bandwidth
		let quality;
		if (stream.resolution) {
			quality = stream.resolution.match(/x(\d+)/)[1] + 'p';
		} else {
			quality = (parseInt(stream.avg_bandwidth ?? stream.bandwidth) / 1000000) + 'Mb/s'
		}

		// add stream to list
		const subs = stream.subtitles?.map((s) => {
			return { file: s.uri, label: s.name };
		});
		const auds = stream.audio?.map((a) => {
			return { file: a.uri, label: a.name };
		});
		streams.push({
			url: stream.url,
			quality: quality,
			originalUrl: stream.url,
			headers: headers,
			subtitles: subs ?? null,
			audios: auds ?? null
		});
	}
	return streams.length ? streams : [{
		url: url,
		quality: '',
		originalUrl: url,
		headers: headers,
		subtitles: null,
		audios: null
	}];
}

async function jwplayerExtractor(text, headers) {
	// https://docs.jwplayer.com/players/reference/playlists
	const getsetup = /setup\(({[\s\S]*?})\)/;
	const getsources = /sources:\s*(\[[\s\S]*?\])/;
	const gettracks = /tracks:\s*(\[[\s\S]*?\])/;
	const unpacked = unpackJs(text);

	const videos = [], subtitles = [];

	const data = eval('(' + (getsetup.exec(text) || getsetup.exec(unpacked))?.[1] + ')');

	if (data) {
		var sources = data.sources;
		var tracks = data.tracks;
	} else {
		var sources = eval('(' + (getsources.exec(text) || getsources.exec(unpacked))?.[1] + ')');
		var tracks = eval('(' + (gettracks.exec(text) || gettracks.exec(unpacked))?.[1] + ')');
	}
	for (t of tracks) {
		if (t.type == "captions") {
			subtitles.push({ file: t.file, label: t.label });
		}
	}
	for (s of sources) {
		if (s.file.includes('master.m3u8')) {
			videos.push(...(await m3u8Extractor(s.file, headers)));
		} else if (s.file.includes('.mpd')) {

		} else {
			videos.push({ url: s.file, originalUrl: s.file, quality: '', headers: headers });
		}
	}
	return videos.map(v => {
		v.subtitles = subtitles;
		return v;
	});
}

//--------------------------------------------------------------------------------------------------
//  Extension Helpers
//--------------------------------------------------------------------------------------------------

function sortVideos(streams) {
	const preferences = new SharedPreferences();
	const lang = preferences.get("pref_language", null);
	//const type = preferences.get("pref_type", null);
	const disp = preferences.get("pref_resolution", null)?.replace(/p/i, '');
	const host = preferences.get("pref_host", null);

	const getScore = (quality) => {
		if (!quality) return 0; // Retorna 0 si no hay valor.

		const qLower = quality.toLowerCase();
		const langScore = lang && qLower.includes(lang.toLowerCase()) ? 8 : 0;
		//const typeScore = type && qLower.includes(type.toLowerCase()) ? 4 : 0;
		const dispScore = disp && qLower.includes(disp.toLowerCase()) ? 2 : 0;
		const hostScore = host && qLower.includes(host.toLowerCase()) ? 1 : 0;

		// Se asignan pesos: mayor prioridad al idioma, seguido de type, resolución y host.
		return langScore + dispScore + hostScore;
	}

	return streams.sort((a, b) => {
		// Ordenar por coincidencias descendentes
		const scoreA = getScore(a.quality);
		const scoreB = getScore(b.quality);

		if (scoreA !== scoreB) return scoreB - scoreA;

		// Si los puntajes son iguales, compara la resolución numérica descendente
		const matchDispA = a.quality.match(/(\d+)p/i)?.[1] || 0;
		const matchDispB = b.quality.match(/(\d+)p/i)?.[1] || 0;

		if (matchDispA !== matchDispB) return Number(matchDispB) - Number(matchDispA);

		// Como último recurso, ordena alfabéticamente
		return a.quality.localeCompare(b.quality);
	});
}

//--------------------------------------------------------------------------------------------------
//  String
//--------------------------------------------------------------------------------------------------

function getRandomString(length) {
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890";
	let result = "";
	for (let i = 0; i < length; i++) {
		const random = Math.floor(Math.random() * 61);
		result += chars[random];
	}
	return result;
}

//--------------------------------------------------------------------------------------------------
//  Url
//--------------------------------------------------------------------------------------------------

function absUrl(url, base) {
	if (url.search(/^\w+:\/\//) == 0) {
		return url;
	} else if (url.startsWith('/')) {
		return base.slice(0, base.lastIndexOf('/')) + url;
	} else {
		return base.slice(0, base.lastIndexOf('/') + 1) + url;
	}
}