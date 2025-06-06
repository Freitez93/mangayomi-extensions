const mangayomiSources = [
	{
		"name": "AnimeJL",
		"lang": "es",
		"baseUrl": "https://www.anime-jl.net",
		"apiUrl": "",
		"iconUrl": "https://www.anime-jl.net/favicon.ico",
		"typeSource": "single",
		"itemType": 1,
		"version": "0.0.6",
		"dateFormat": "",
		"dateFormatLocale": "",
		"pkgPath": "anime/src/es/animejl.js"
	}
];

class DefaultExtension extends MProvider {
	async requestPlus(url) {
		const DOMAIN = 'https://www.anime-jl.net/'

		try {
			const assembleURL = absUrl(url, DOMAIN);

			return await new Client({ 'useDartHttpClient': true }).get(assembleURL);
		} catch (error) {
			console.log('Error en request: ' + error.message)
		}
	}

	async getDataList (url){
		try {
			const searchRes = await this.requestPlus(url);
			const searchHtml = new Document(searchRes.body);

			const movies = [];
			const nextPage = searchHtml.selectFirst('.pagination a[rel=next]') ? true : false;
			searchHtml.select('li > article').map(item => {
				const title = item.selectFirst('h3.Title').text;
				const cover = item.selectFirst('img').getSrc;
				const _link = item.selectFirst('a').getHref;

				movies.push({
					name: title,
					imageUrl: absUrl(cover, 'https://www.anime-jl.net/'),
					link: _link
				})
			})

			return {
				list: movies,
				hasNextPage: nextPage
			}
		} catch (error) {
			console.log(`Error en getDataList: ${error.message || error}`)
		}
	}

	async getPopular(page) {
		return await this.getDataList(`/animes?order=views&page=${page}`);
	}

	async getLatestUpdates(page) {
		return await this.getDataList(`/animes?estado=0&order=created&page=${page}`);
	}

	async search(query, page, filters) {
		let searchUrl = `/animes?page=${page}`

		if (query) {
			searchUrl = `/animes?buscar=${encodeURI(query)}&pag=${page}`
		} else if (filters) {
			searchUrl = this.assembleFilter(filters, page)
		}

		return await this.getDataList(searchUrl);
	}

	async getDetail(url) {
		try {
			const detailRes = await this.requestPlus(url);
			const detailHtml = new Document(detailRes.body);

			const title = detailHtml.selectFirst('title').text.split(' - ')[0];
			const cover = detailHtml.selectFirst('figure > img').getSrc;
			const description = detailHtml.selectFirst('.Description').text;
			const status = detailHtml.selectFirst('.AnmStts > span').text;
			const genres = detailHtml.select('.Nvgnrs > a').map(item => item.text);
			const episodes = [];

			const dataEpisode = detailRes.body.match(/var episodes = (.+?),];/)?.[1];
			if (dataEpisode) {
				const episodeJSON = JSON.parse(`${dataEpisode}]`);
				for (const episode of episodeJSON){
					episodes.push({
						name: `Episodio ${episode[0]}`,
						url: `${url}/${episode[1]}`,
						dateUpload: String(new Date().valueOf()),
					})
				}
			} else {
				const episodeInfo = JSON.parse(detailRes.body.match(/var anime_info = (.+?);/)?.[1])
				episodes.push({
					name: `Proximamente: ${episodeInfo[3]}`,
					url: "",
					dateUpload: String(new Date(episodeInfo[3]).valueOf()),
				})
			}

			return {
				name: title,
				link: url,
				imageUrl: absUrl(cover, 'https://www.anime-jl.net/'),
				description: description.trim(),
				status: this.parseStatus(status),
				genre: genres,
				episodes: episodes
			}
		} catch (error) {
			console.error(error.message)
		}
	}

	// For anime episode video list
	async getVideoList(url) {
		try {
			const response = await this.requestPlus(url);
			const videoHtml = new Document(response.body);

			const title = videoHtml.selectFirst('h1.Title').text;
			const matches = [...response.body.matchAll(/'<iframe src="([^"]+)"/g)].map(match => match[1]);

			const renameLUT = {
				'Smoothpre': 'VidHide', 'vidhidevip': 'VidHide', 'ryderjet': 'VidHide',
				'ghbrisk': 'StreamWish', 'playerwish': 'StreamWish', 'cdnwish': 'StreamWish',
				'listeamed': 'VidGuard',
				'ok': 'okru',
				// Omitidos
				'filemoon': 'FileMoon-omit',
				'cybervynx': 'StreamWish-omit',
			}
	
			const promises = matches.map(link => {
				const urlObj = link.split('/')[2].split('.')
				const host = urlObj[0] === 'www' ? urlObj[1] : urlObj[0];
		
				const method = renameLUT[host] ?? host;
				const isLang = title.includes('Latino') ? 'Latino' : title.includes('Castellano') ? 'Español' : 'Japonés';
				const isType = isLang === 'Japonés' ? 'SUB-Esp' : 'DUB'

				return extractAny(link, method, isLang, isType, method);
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
			throw new Error('Error al obtener la lista de videos.')
		}
	}

	assembleFilter(filters, page) {
		const params = [];
		filters.forEach(item => {
			const passFilter = item.values ? item.values[item.state].value : item.status
			
			if (passFilter !== "" && passFilter !== undefined) {
				//console.log(`filterType: ${item.type} | value: ${passFilter}`)

				const paramGenerators = {
					'GenreFilter': () => `genre[]=${item.values[item.state].value}`,
					'YearFilter': () => `year[]=${item.state}`,
					'TypeFilter': () => `tipo[]=${item.values[item.state].value}`,
					'StateFilter': () => `estado[]=${item.values[item.state].value}`,
					'OrderFilter': () => `order=${item.values[item.state].value}`
				};

				const generateParam = paramGenerators[item.type];
				if (generateParam) {
					params.push(generateParam());
				}
			}
		});

		params.push(`page=${page}`);

		// Construct and return complete URL
		return `/animes?${params.join('&')}`;
	}

	parseStatus(statusString) {
		if (statusString.includes("En emision")) {
			return 0;
		} else if (statusString.includes("Finalizado")) {
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
					{ name: "Accion", value: "1", type_name: "SelectOption" },
					{ name: "Artes Marciales", value: "2", type_name: "SelectOption" },
					{ name: "Aventuras", value: "3", type_name: "SelectOption" },
					{ name: "Ciencia Ficcion", value: "33", type_name: "SelectOption" },
					{ name: "Comedia", value: "9", type_name: "SelectOption" },
					{ name: "Cultivacion", value: "71", type_name: "SelectOption" },
					{ name: "Demencia", value: "40", type_name: "SelectOption" },
					{ name: "Demonios", value: "42", type_name: "SelectOption" },
					{ name: "Deportes", value: "27", type_name: "SelectOption" },
					{ name: "Donghua", value: "50", type_name: "SelectOption" },
					{ name: "Drama", value: "10", type_name: "SelectOption" },
					{ name: "Ecchi", value: "25", type_name: "SelectOption" },
					{ name: "Escolares", value: "22", type_name: "SelectOption" },
					{ name: "Espacial", value: "48", type_name: "SelectOption" },
					{ name: "Fantasia", value: "6", type_name: "SelectOption" },
					{ name: "Gore", value: "67", type_name: "SelectOption" },
					{ name: "Harem", value: "32", type_name: "SelectOption" },
					{ name: "Hentai", value: "31", type_name: "SelectOption" },
					{ name: "Historico", value: "43", type_name: "SelectOption" },
					{ name: "Horror", value: "39", type_name: "SelectOption" },
					{ name: "Isekai", value: "45", type_name: "SelectOption" },
					{ name: "Josei", value: "70", type_name: "SelectOption" },
					{ name: "Juegos", value: "11", type_name: "SelectOption" },
					{ name: "Latino / Castellano", value: "46", type_name: "SelectOption" },
					{ name: "Magia", value: "38", type_name: "SelectOption" },
					{ name: "Mecha", value: "41", type_name: "SelectOption" },
					{ name: "Militar", value: "44", type_name: "SelectOption" },
					{ name: "Misterio", value: "26", type_name: "SelectOption" },
					{ name: "Mitologia", value: "73", type_name: "SelectOption" },
					{ name: "Musica", value: "28", type_name: "SelectOption" },
					{ name: "Parodia", value: "13", type_name: "SelectOption" },
					{ name: "Policia", value: "51", type_name: "SelectOption" },
					{ name: "Psicologico", value: "29", type_name: "SelectOption" },
					{ name: "Recuentos de la vida", value: "23", type_name: "SelectOption" },
					{ name: "Reencarnacion", value: "72", type_name: "SelectOption" },
					{ name: "Romance", value: "12", type_name: "SelectOption" },
					{ name: "Samurai", value: "69", type_name: "SelectOption" },
					{ name: "Seinen", value: "24", type_name: "SelectOption" },
					{ name: "Shoujo", value: "36", type_name: "SelectOption" },
					{ name: "Shounen", value: "4", type_name: "SelectOption" },
					{ name: "Sin Censura", value: "68", type_name: "SelectOption" },
					{ name: "Sobrenatural", value: "7", type_name: "SelectOption" },
					{ name: "Superpoderes", value: "5", type_name: "SelectOption" },
					{ name: "Suspenso", value: "21", type_name: "SelectOption" },
					{ name: "Terror", value: "20", type_name: "SelectOption" },
					{ name: "Vampiros", value: "49", type_name: "SelectOption" },
					{ name: "Venganza", value: "74", type_name: "SelectOption" },
					{ name: "Yaoi", value: "53", type_name: "SelectOption" },
					{ name: "Yuri", value: "52", type_name: "SelectOption" }
				]
			},
			{
				type: "TypeFilter",
				name: "Tipo",
				type_name: "SelectFilter",
				values: [
					{ name: "Default", value: "", type_name: "SelectOption" },
					{ name: "Anime", value: "1", type_name: "SelectOption" },
					{ name: "Ova", value: "2", type_name: "SelectOption" },
					{ name: "Pelicula", value: "3", type_name: "SelectOption" },
					{ name: "Donghua", value: "7", type_name: "SelectOption" }
				]
			},
			{
				type: "StateFilter",
				name: "Estado",
				type_name: "SelectFilter",
				values: [
					{ name: "Default", value: "", type_name: "SelectOption" },
					{ name: "En emisión", value: "0", type_name: "SelectOption" },
					{ name: "Finalizado", value: "1", type_name: "SelectOption" },
					{ name: "Próximamente", value: "2", type_name: "SelectOption" }
				]
			},
			{
				type: "OrderFilter",
				name: "Orden",
				type_name: "SelectFilter",
				values: [
					{ name: "Default", value: "created", type_name: "SelectOption" },
					{ name: "Recientemente Actualizados", value: "updated", type_name: "SelectOption" },
					{ name: "Nombre A-Z", value: "titleaz", type_name: "SelectOption" },
					{ name: "Nombre Z-A", value: "titleza", type_name: "SelectOption" },
					{ name: "Calificación", value: "rating", type_name: "SelectOption" },
					{ name: "Vistas", value: "views", type_name: "SelectOption" }
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
		const hosts = [
			'DoodStream',
			'Filemoon',
			'Luluvdo',
			'mp4Upload',
			'Okru',
			'StreamWish',
			'VidGuard',
			'VidHide',
			'Voe',
			'YourUpload'
		];

		return [
			{
				key: 'pref_resolution',
				listPreference: {
					title: 'Preferred Resolution',
					summary: 'Si está disponible, se elegirá esta resolución por defecto. Prioridad = 2',
					valueIndex: 0,
					entries: ['1080p', '720p', '480p'],
					entryValues: ['1080', '720', '480']
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

/***************************************************************************************************
* 
*   mangayomi-js-helpers (Editado con solo lo que esta extencion nesecita)
*       
*   # Video Extractors
*       - vidGuardExtractor
*       - doodExtractor
*       - okruExtractor
*       - vidHideExtractor
*       - filemoonExtractor
*       - luluvdoExtractor
*   
*   # Video Extractor Wrappers
*       - streamWishExtractor
*       - voeExtractor
*       - mp4UploadExtractor
*       - yourUploadExtractor
*       - streamTapeExtractor
*		- sendVidExtractor
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

async function vidGuardExtractor(url) {
	// get html
	const res = await new Client().get(url);
	const doc = new Document(res.body);
	const script = doc.selectFirst('script:contains(eval)');

	// eval code
	const code = script.text;
	eval?.('var window = {};');
	eval?.(code);
	const playlistUrl = globalThis.window.svg.stream;

	// decode sig
	const encoded = playlistUrl.match(/sig=(.*?)&/)[1];
	const charCodes = [];

	for (let i = 0; i < encoded.length; i += 2) {
		charCodes.push(parseInt(encoded.slice(i, i + 2), 16) ^ 2);
	}

	let decoded = Uint8Array.fromBase64(String.fromCharCode(...charCodes)).slice(5, -5).reverse();

	for (let i = 0; i < decoded.length; i += 2) {
		let tmp = decoded[i];
		decoded[i] = decoded[i + 1];
		decoded[i + 1] = tmp;
	}

	decoded = decoded.decode();
	return await m3u8Extractor(playlistUrl.replace(encoded, decoded), null);
}

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

async function vidHideExtractor(url, headers) {
	const videos = [];

	try {
		// Fetch the webpage content
		const res = await new Client().get(url);

		// Extract and unpack the obfuscated script
		const unpacked = unpackJs(res.body);
		const linksMatch = unpacked.match(/var links=(.*?);/);

		// Extract video links from the unpacked script
		if (linksMatch) {
			const links = JSON.parse(linksMatch[1]);
			const link = links.hls4 || links.hls2;

			if (link.includes('/master.m3u8')) {
				videos.push(...await m3u8Extractor(link, headers));
			} else if (link.includes('.mpd')) {
				// MPD format handling logic to be implemented
			} else {
				videos.push({ url: link, originalUrl: link, quality: '', headers });
			}
		} else {
			// se usa otro metodo de extraccion.
			videos.push(...await jwplayerExtractor(res.body, headers));
		}
	} catch (error) {
		console.log('Error in vidHideExtractor: ', error);
	}
	return videos;
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

async function luluvdoExtractor(url) {
	const client = new Client();
	const match = url.match(/(.*?:\/\/.*?)\/.*\/(.*)/);
	const headers = { 'user-agent': 'Mangayomi' };
	const res = await client.get(`${match[1]}/dl?op=embed&file_code=${match[2]}`, headers);
	return await jwplayerExtractor(res.body, headers);
}

async function uqLoadExtractor(url) {
	const headers = {
		Referer: 'https://uqload.net',
		origin: 'https://uqload.net/'
	}

	try {
		const res = await new Client().get(url);
		const playlistUrl = res.body.match(/sources: (\[.+?\])/)?.[1];
		if (playlistUrl) {
			const videoUrl = JSON.parse(playlistUrl)[0];
			return [
				{ url: videoUrl, originalUrl: videoUrl, quality: '', headers }
			]
		}
	} catch (error) {
		return [];
	}
}

//--------------------------------------------------------------------------------------------------
//  Video Extractor Wrappers
//--------------------------------------------------------------------------------------------------

_streamWishExtractor = streamWishExtractor;
streamWishExtractor = async (url) => {
	return (await _streamWishExtractor(url, '')).map(v => {
		v.quality = v.quality.slice(3, -1);
		return v;
	});
}

_voeExtractor = voeExtractor;
voeExtractor = async (url) => {
	return (await _voeExtractor(url, '')).map(v => {
		v.quality = v.quality.replace(/Voe: (\d+p?)/i, '$1');
		return v;
	});
}

_mp4UploadExtractor = mp4UploadExtractor;
mp4UploadExtractor = async (url) => {
	return (await _mp4UploadExtractor(url)).map(v => {
		v.quality = v.quality.match(/\d+p/)?.[0] ?? '';
		return v;
	});
}

_yourUploadExtractor = yourUploadExtractor;
yourUploadExtractor = async (url) => {
	return (await _yourUploadExtractor(url))
		.filter(v => !v.url.includes('/novideo'))
		.map(v => {
			v.quality = '';
			return v;
		});
}

_streamTapeExtractor = streamTapeExtractor;
streamTapeExtractor = async (url) => {
	return await _streamTapeExtractor(url, '');
}

_sendVidExtractor = sendVidExtractor;
sendVidExtractor = async (url) => {
	try {
		const res = await new Client().get(url);
		const videoUrlMatch = res.body.match(/og:video" content="(.*?\.mp4.*?)"/);
		const qualityMatch = res.body.match(/og:video:height" content="(.*?)"/);

		const videoUrl = videoUrlMatch?.[1];
		const quality = qualityMatch?.[1] ? `${qualityMatch[1]}p` : '';

		if (!videoUrl) return _sendVidExtractor(url, null, '');

		return [{
			url: videoUrl,
			originalUrl: videoUrl,
			quality,
			headers: null
		}];
	} catch (error) {
		return _sendVidExtractor(url, null, '');
	}
};

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
	'doodstream': doodExtractor,
	'filemoon': filemoonExtractor,
	'luluvdo': luluvdoExtractor,
	'mp4upload': mp4UploadExtractor,
	'okru': okruExtractor,
	'sendvid': sendVidExtractor,
	'streamtape': streamTapeExtractor,
	'streamwish': vidHideExtractor,
	'vidguard': vidGuardExtractor,
	'vidhide': vidHideExtractor,
	'voe': voeExtractor,
	'yourupload': yourUploadExtractor,
	"uqload": uqLoadExtractor
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
	const disp = preferences.get("pref_resolution");
	const host = preferences.get("pref_host");

	const getScore = (quality) => {
		const dispScore = disp === null || quality.toLowerCase().includes(disp.toLowerCase()) ? 1 : 0;
		const hostScore = host === null || quality.toLowerCase().includes(host.toLowerCase()) ? 1 : 0;

		// Se asignan pesos: mayor prioridad al idioma, seguido de resolución y host.
		return (dispScore * 8) + (hostScore * 4);
	}

	return streams.sort(
		// Ordenar por coincidencias descendentes
		(a, b) => {
			const scoreA = getScore(a.quality);
			const scoreB = getScore(b.quality);

			if (scoreA !== scoreB) return scoreB - scoreA;

			// Si los puntajes son iguales, compara la resolución numérica descendente
			const matchDispA = a.quality.match(/(\d+)[Pp]/)?.[1] || 0;
			const matchDispB = b.quality.match(/(\d+)[Pp]/)?.[1] || 0;

			if (matchDispA !== matchDispB) return Number(matchDispB) - Number(matchDispA);

			// Como último recurso, ordena alfabéticamente
			return a.quality.localeCompare(b.quality);
		}
	);
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