const mangayomiSources = [
	{
		"name": "PelisPlusHD",
		"lang": "es",
		"baseUrl": "https://PelisPlusHD.bz/",
		"apiUrl": "",
		"iconUrl": "https://pelisplushd.bz/images/logo/favicon.png",
		"typeSource": "single",
		"itemType": 1,
		"isNsfw": false,
		"version": "1.0.6",
		"dateFormat": "",
		"dateFormatLocale": "",
		"pkgPath": "anime/src/es/pelisplushd.js"
	}
];

class DefaultExtension extends MProvider {
	async requestPlus(url) {
		const DOMAIN_API = "https://PelisPlusHD.bz/";
		try {
			const assembleURL = absUrl(url, DOMAIN_API);
			return await new Client({ 'useDartHttpClient': true }).get(assembleURL);
		} catch (error) {
			console.log('Error en request: ' + error.message)
		}
	}

	async scrapUrl(url) {
		try {
			const searchRes = await this.requestPlus(url);
			const searchDoc = new Document(searchRes.body)

			// Verificamos si hay una pagina siguiente.
			const nextPage = searchDoc.selectFirst('a.page-link[rel="next"]').attr('href') ? true : false

			// Scrapeamos las peliculas/series
			const movies = []
			searchDoc.select('.Posters > a').map(item => {
				const title = item.selectFirst('.listing-content > p').text;
				const cover = item.selectFirst('img').getSrc;
				const _link = item.getHref;

				movies.push({
					name: title,
					imageUrl: cover,
					link: _link
				})
			})
			return { list: movies, hasNextPage: nextPage }
		} catch (error) {
			throw new Error(`Error en scrapUrl: ${error ?? error.message}`)
		}
	}

	async getPopular(page) {
		return await this.scrapUrl(`/peliculas/populares?page=${page}`);
	}

	async getLatestUpdates(page) {
		return await this.scrapUrl(`/year/2025?page=${page}`);
	}

	async search(query, page, filters) {
		let searchUrl = `/search`

		if (query) {
			searchUrl = `/search?s=${query.replaceAll(" ", "+")}&page=${page}`
		} else if (filters) {
			searchUrl = this.assembleFilter(filters, page)
		}

		const searchRes = await this.scrapUrl(searchUrl);
		return {
			list: searchRes.list,
			hasNextPage: searchRes.hasNextPage
		}
	}

	async getDetail(url) {
		const detailRes = await this.requestPlus(url);
		const detailDoc = new Document(detailRes.body);
		const isMovie = url.includes('/pelicula/')

		// Obtenemos los datos basicos.
		const title = detailDoc.selectFirst('h1.m-b-5').text?.substringBeforeLast(' (').trim()
		const image = detailDoc.selectFirst('meta[itemprop="image"]').attr('content')
		const texts = detailDoc.selectFirst('.text-large').text.trim()
		const genre = detailDoc.select('.p-v-20 > a > span').map( item => item.text.trim() )
		const date_str = detailDoc.select('.sectionDetail').pop()?.text?.substringAfter('estreno: ').trim()
		const date_num = String(new Date(date_str).getTime())

		const episodes = []
		if (isMovie) {
			episodes.push({
				name: "Pelicula",
				url: url,
				dateUpload: date_num
			})
		} else {
			const list_episodes = detailDoc.select('div[role="tabpanel"] > a')
			list_episodes.map(item => {
				episodes.push({
					name: item.text.replace(/\s+/g, ' ').trim(),
					url: item.getHref,
					dateUpload: date_num
				})
			})
		}

		return {
			name: title,
			link: url,
			imageUrl: image,
			description: texts,
			status: isMovie ? 1 : 5,
			genre: genre,
			episodes: episodes
		}
	}

	// For anime episode video list
	async getVideoList(url) {
		try {
			// Obtener y parsear el JSON de la URL proporcionada
			const response = await this.requestPlus(url);
			const sources = []
			for (let index=1; index<4; index++){
				const link = response.body.substringBetween(`video[${index}] = '`, "';")
				if (link?.includes('embed69')){
					sources.push(... await this.decryptLinksByEmbed69(link))
				} else if (link?.includes('xupalace.org/video/tt')){
					sources.push(... await this.xupalaceExtractor(link))
				} else if (link?.includes('uqlink')){
					sources.push({ url: link, method: 'UqLink', lang: 'Latino', type: 'Dub' })
				} else if (link?.includes('waaw')){
					console.log('Metodo de WaaW no Implementado.')
					// No implementado.
				}
			}

			// Mapear cada video a una promesa de extracción
			const promises = sources.map(video => {
				return extractAny(video.url, video.method, video.lang, video.type, video.method);
			});

			// Esperar a que todas las promesas se resuelvan o rechacen
			const results = await Promise.allSettled(promises);

			// Filtrar y aplanar los resultados cumplidos
			const videos = results
				.filter(p => p.status === 'fulfilled')
				.flatMap(p => p.value);

			// Retornar los videos ordenados
			return sortVideos(videos);
		} catch (error) {
			throw new Error(`getVideoList: ${error}`)
		}
	}

	async decryptLinksByEmbed69(embed69Link) {
		const dartClient = new Client()
		const source = []

		try {
			const response = await dartClient.get(embed69Link)
			const dataLink = JSON.parse(response.body.substringBetween('let dataLink = ', ';'))

			// Iterar sobre cada elemento de dataLink
			for (const item of dataLink) {
				const language = renameLang[item.video_language] ?? item.video_language;
				const encryptedLinks = item.sortedEmbeds.map(embed => embed.link);

				// Enviar los enlaces al endpoint
				const decryptRes = await dartClient.post('https://embed69.org/api/decrypt',
					{ 'Referer': embed69Link, 'Content-Type': 'application/json' },
					{ links: encryptedLinks }
				);

				const data = JSON.parse(decryptRes.body)
				if (!decryptRes.statusCode == 200){
					console.error(`HTTP Error: ${decryptRes.reasonPhrase}`);
				}

				// Procesar los enlaces descifrados para remover backticks y espacios extra
				var index = 0
				const filter_link = data.links.filter(item => item.link).map(item => item.link.replace(/`/g, '').trim())
				for (const link of filter_link){
					const host = item.sortedEmbeds[index++].servername
					source.push({
						url: link,
						method: renameHost[host] ?? 'Unknown',
						lang: language === 'Subtitulado' ? 'Original' : language,
						type: language === 'Subtitulado' ? 'Sub' : 'Dub',
					})
				}
			}
			return source
		} catch (error) {
			console.error(`Error decrypting links: ${error}`);
			return [];
		}
	}

	async xupalaceExtractor(xupalaceLink){
		const dartClient = new Client()
		const source = []

		try {
			const dataRes = await dartClient.get(xupalaceLink)
			const dataDoc = new Document(dataRes.body)
			dataDoc.select('.OD_1 > li').map(item => {
				let language = renameLang[item.attr('data-lang')]
				source.push({
					url: item.attr('onclick').substringBetween("('", "',"),
					method: renameHost[item.selectFirst('span').text.trim()] ?? 'Unknown',
					lang: language === 'Subtitulado' ? 'Original' : language,
					type: language === 'Subtitulado' ? 'Sub' : 'Dub',
				})
			})
			return source
		} catch (error) {
			console.error(`Error extracted links: ${error}`);
			return [];
		}
	}

	assembleFilter(filters, page) {
		const on = {}
		filters.forEach(item => {
			console.log(`Type: ${item.type}\nState: ${item.state}`)
			if (item.type == 'YearFilter') {
				on['YearFilter'] = item.state
			} else if (item.state != "0" && item.type != null) {
				on[item.type] = item.values[item.state].value
			}
		})

		// Contruimos la direccion url de busqueda.
		const isType = on['TypeFilter'] ? `/${on['TypeFilter']}` : ''
		const isPage = page == 1 ? '' : `?page=${page}`
		if (on['GenreFilter']){
			var href = `/generos/${on['GenreFilter'] + isType + isPage}`
			if (on['GenreFilter'] == 'Dorama') {
				href = `/generos/dorama${isPage}`
			}
		} else if (on['YearFilter']){
			var href = `/year/${on['YearFilter'] + isType + isPage}`
		}

		// Retornamos el href ya contruido.
		return href;
	}

	getFilterList() {
		return [
			{
				type_name: "HeaderFilter",
				name: "El filtro se ignora cuando se utiliza la búsqueda de texto.",
			},
			{
				type: "GenreFilter",
				name: "Genero",
				type_name: "SelectFilter",
				values: [
					{
						name: "< Seleccione un Genero >",
						value: "0",
						type_name: "SelectOption"
					},
					{
						name: "Acción",
						value: "accion",
						type_name: "SelectOption"
					},
					{
						name: "Animación",
						value: "animacion",
						type_name: "SelectOption"
					},
					{
						name: "Aventura",
						value: "aventura",
						type_name: "SelectOption"
					},
					{
						name: "Comedia",
						value: "comedia",
						type_name: "SelectOption"
					},
					{
						name: "Crimen",
						value: "crimen",
						type_name: "SelectOption"
					},
					{
						name: "Documental",
						value: "documental",
						type_name: "SelectOption"
					},
					{
						name: "Doramas",
						value: "doramas",
						type_name: "SelectOption"
					},
					{
						name: "Drama",
						value: "drama",
						type_name: "SelectOption"
					},
					{
						name: "Fantasia",
						value: "fantasia",
						type_name: "SelectOption"
					},
					{
						name: "Guerra",
						value: "guerra",
						type_name: "SelectOption"
					},
					{
						name: "Historia",
						value: "historia",
						type_name: "SelectOption"
					},
					{
						name: "Romance",
						value: "romance",
						type_name: "SelectOption"
					},
					{
						name: "Suspense",
						value: "suspense",
						type_name: "SelectOption"
					},
					{
						name: "Terror",
						value: "terror",
						type_name: "SelectOption"
					},
					{
						name: "Western",
						value: "western",
						type_name: "SelectOption"
					},
					{
						name: "Misterio",
						value: "misterio",
						type_name: "SelectOption"
					}
				]
			},
			{
				type: "TypeFilter",
				name: "Type",
				type_name: "SelectFilter",
				values: [
					{
						name: "All",
						value: "0",
						type_name: "SelectOption",
					},
					{
						name: "Peliculas",
						value: "peliculas",
						type_name: "SelectOption",
					},
					{
						name: "Series",
						value: "series",
						type_name: "SelectOption",
					},
					{
						name: "Animes",
						value: "animes",
						type_name: "SelectOption",
					}
				]
			},
			{
				type_name: "HeaderFilter",
				name: "Busqueda por año, ejemplo: 2025",
			},
			{
				type_name: "TextFilter",
				type: "YearFilter",
				name: "Año",
			}
		];
	}

	getSourcePreferences() {
		const languages = ['Latino', 'Español', 'English'];
		const types = ['Sub', 'Dub'];
		const resolutions = ['1080p', '720p', '480p'];
		const hosts = [
			"StreamWish",
			"StreamTape",
			"DoodStream",
			"StreamLare",
			"FileMoon",
			"VidHide",
			"Okru",
			"Voe"
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
				key: 'pref_type',
				listPreference: {
					title: 'Preferred Type',
					summary: 'Si está disponible, se elegirá este tipo por defecto. Prioridad = 1',
					valueIndex: 0,
					entries: types,
					entryValues: types
				}
			},
			{
				key: 'pref_resolution',
				listPreference: {
					title: 'Preferred Resolution',
					summary: 'Si está disponible, se elegirá esta resolución por defecto. Prioridad = 2',
					valueIndex: 0,
					entries: resolutions,
					entryValues: resolutions
				}
			},
			{
				key: 'pref_host',
				listPreference: {
					title: 'Preferred Host',
					summary: 'Si está disponible, este host será elegido por defecto. Prioridad = 3',
					valueIndex: 0,
					entries: hosts,
					entryValues: hosts
				}
			}
		];
	}
}

const renameLang = {
	'0': 'Latino',
	'1': 'Español',
	'2': 'Subtitulado',
	'LAT': 'Latino',
	'ESP': 'Español',
	'SUB': 'Subtitulado'
}

const renameHost = {
	'vidhide': 'VidHide',
	'up2box': 'Up2Box',
	'streamwish': 'StreamWish',
	'filemoon': 'FileMoon',
	'stape': 'StreamTape',
	'waaw': 'WaaW',
	'voe': 'Voe'
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
*       - luluvdoExtractor
*       - streamHideExtractor
*   
*   # Video Extractor Wrappers
*       - voeExtractor
*       - streamTapeExtractor
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

async function vidHideExtractor(url) {
	const res = await new Client().get(url);
	return await jwplayerExtractor(res.body);
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

async function uqLinkExtractor(url) {
	const dartClient = new Client({ 'useDartHttpClient': true, "followRedirects": true })
	const uqLink = `https://uqload.io/embed-${url.split('id=').pop()}.html`
	const source = [];

	try {
		const uqRes = await dartClient.get(uqLink)
		const uqStr = uqRes.body.substringBetween('sources: [', '],')
		const uqObj = JSON.parse(`[${uqStr}]`)
		for (const link of uqObj){
			source.push({
				url: link,
				originalUrl: link,
				quality: '',
				headers: { 'Referer': uqLink }
			})
		}
		return source
	} catch (error) {
		console.error(`Error in uqLinkExtractor: ${error}`);
		return source;
	}
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
		const html = response.body;

		// Unpack obfuscated JS
		const unpacked = unpackJs(html);
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

//--------------------------------------------------------------------------------------------------
//  Video Extractor Wrappers
//--------------------------------------------------------------------------------------------------

_voeExtractor = voeExtractor;
voeExtractor = async (url) => {
	return (await _voeExtractor(url, '')).map(v => {
		v.quality = v.quality.replace(/Voe: (\d+p?)/i, '$1');
		return v;
	});
}

_streamTapeExtractor = streamTapeExtractor;
streamTapeExtractor = async (url) => {
	return await _streamTapeExtractor(url, '');
}

//--------------------------------------------------------------------------------------------------
//  Video Extractor Helpers
//--------------------------------------------------------------------------------------------------

async function extractAny(url, method, lang, type, host, headers = null) {
	const m = extractAny.methods[method.toLowerCase()];
	return (!m) ? [] : (await m(url, headers)).map(v => {
		v.quality = v.quality ? `${lang} ${type} ${host}: ${v.quality}` : `${lang} ${type} ${host}`;
		return v;
	});
};

extractAny.methods = {
	'streamwish': streamHideExtractor,
	'streamtape': streamTapeExtractor,
	'doodstream': doodExtractor,
	'filemoon': filemoonExtractor,
	'vidhide': streamHideExtractor,
	'uqlink': uqLinkExtractor,
	'okru': okruExtractor,
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
	const lang = preferences.get("pref_language");
	const type = preferences.get("pref_type");
	const disp = preferences.get("pref_resolution")?.replace(/p/i, '');
	const host = preferences.get("pref_host");

	const getScore = (quality) => {
		if (!quality) return 0; // Retorna 0 si no hay valor.

		const qLower = quality.toLowerCase();
		const langScore = lang && qLower.includes(lang.toLowerCase()) ? 8 : 0;
		const typeScore = type && qLower.includes(type.toLowerCase()) ? 4 : 0;
		const dispScore = disp && qLower.includes(disp.toLowerCase()) ? 2 : 0;
		const hostScore = host && qLower.includes(host.toLowerCase()) ? 1 : 0;

		// Se asignan pesos: mayor prioridad al idioma, seguido de type, resolución y host.
		return langScore + typeScore + dispScore + hostScore;
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