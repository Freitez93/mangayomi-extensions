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
		"version": "0.0.5",
		"dateFormat": "",
		"dateFormatLocale": "",
		"pkgPath": "anime/src/es/pelisplushd.js"
	}
];

class DefaultExtension extends MProvider {
	async requestPlus(url) {
		const DOMAIN_API = new SharedPreferences().get("apiUrl");

		try {
			const assembleURL = absUrl(url, DOMAIN_API);

			return await new Client({ 'useDartHttpClient': true }).get(assembleURL);
		} catch (error) {
			console.log('Error en request: ' + error.message)
		}
	}

	async getPopular(page) {
		return await this.search(false, page, false);
	}

	async getLatestUpdates(page) {
		return await this.search(false, page, [{
			"type": "YearFilter",
			"name": "Año",
			"state": "2025",
			"type_name": "TextFilter"
		}]);
	}

	async search(query, page, filters) {
		let searchUrl = `/search`

		if (query) {
			searchUrl = `/search?query=${query.replaceAll(" ", "+")}&page=${page}`
		} else if (filters) {
			searchUrl = this.assembleFilter(filters, page)
		}

		const searchRes = await this.requestPlus(searchUrl);
		const searchJson = JSON.parse(searchRes.body);

		const movies = [];
		for (const element of searchJson.results) {
			movies.push({
				name: element.title,
				imageUrl: element.image,
				link: element.id
			})
		}

		return {
			list: movies,
			hasNextPage: searchJson.hasNextPage
		}
	}
	async getDetail(url) {
		const detailRes = await this.requestPlus(url);
		const detailJson = JSON.parse(detailRes.body);

		const episodes = []
		if (detailJson.type === 'Movie') {
			episodes.push({
				name: "Pelicula",
				url: detailJson.episodes[0].id
			})
		} else {
			detailJson.episodes.map(season => {
				for (const episode of season.episodes) {
					episodes.push({
						name: episode.name,
						url: episode.id
					})
				}
			})
		}

		return {
			name: detailJson.title,
			link: detailJson.url,
			imageUrl: detailJson.image,
			description: detailJson.description,
			status: detailJson.type === 'Movie' ? 1 : 5,
			genre: detailJson.genres,
			episodes: episodes
		}
	}

	// For anime episode video list
	async getVideoList(url) {
		try {
			// Obtener y parsear el JSON de la URL proporcionada
			const response = await this.requestPlus(url);
			const videoJson = JSON.parse(response.body);

			// Lookup table para normalizar nombres de servidores
			const renameLUT = {
				'hide': 'vidhide',
				'ru': 'okru',
				'ok.ru': 'okru',
				'stream2': 'vidhide',
				'lulustream': 'luluvdo'
			};

			// Mapear cada video a una promesa de extracción
			const promises = videoJson.source.map(video => {
				const server = video.server.toLowerCase();
				const method = renameLUT[server] ?? server;
				const isType = video.language === 'Subtitulado' ? 'Sub' : 'Dub';
				const isLang = video.language === 'Subtitulado' ? 'English' : video.language;

				return extractAny(video.link, method, isLang, isType, video.server);
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
			// console.error('Error al obtener la lista de videos:', error);
			throw new Error('Error al obtener la lista de videos.')
		}
	}

	assembleFilter(filters, page) {

		const params = [];
		filters.forEach(item => {
			if (item.state !== 0) {
				const paramGenerators = {
					'YearFilter': () => `year=${item.state}`,
					'GenreFilter': () => `genre=${item.values[item.state].value}`,
					'TypeFilter': () => `type=${item.values[item.state].value}`
				};

				const generateParam = paramGenerators[item.type];
				if (generateParam) {
					params.push(generateParam());
				}
			}
		});

		params.push(`page=${page}`);

		// Construct and return complete URL
		return `/search?${params.join('&')}`;
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
						value: "movie",
						type_name: "SelectOption",
					},
					{
						name: "Series",
						value: "serie",
						type_name: "SelectOption",
					},
					{
						name: "Animes",
						value: "anime",
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
			"LuluStream",
			"FileMoon",
			"Okru",
			"Voe"
		];

		return [
			{
				key: 'lang',
				listPreference: {
					title: 'Preferred Language',
					summary: 'Si está disponible, este idioma se elegirá por defecto. Prioridad = 0',
					valueIndex: 0,
					entries: languages,
					entryValues: languages
				}
			},
			{
				key: 'type',
				listPreference: {
					title: 'Preferred Type',
					summary: 'Si está disponible, se elegirá este tipo por defecto. Prioridad = 1',
					valueIndex: 0,
					entries: types,
					entryValues: types
				}
			},
			{
				key: 'res',
				listPreference: {
					title: 'Preferred Resolution',
					summary: 'Si está disponible, se elegirá esta resolución por defecto. Prioridad = 2',
					valueIndex: 0,
					entries: resolutions,
					entryValues: resolutions
				}
			},
			{
				key: 'host',
				listPreference: {
					title: 'Preferred Host',
					summary: 'Si está disponible, este host será elegido por defecto. Prioridad = 3',
					valueIndex: 0,
					entries: hosts,
					entryValues: hosts
				}
			},
			{
				"key": "apiUrl",
				"editTextPreference": {
					"title": "Dirección URL de la API",
					"summary": "https://multi-scraping.vercel.app/movie/pelisplus/",
					"value": "https://multi-scraping.vercel.app/movie/pelisplus/",
					"dialogTitle": "Override API",
					"dialogMessage": "",
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
*       - luluvdoExtractor
*   
*   # Video Extractor Wrappers
*       - streamWishExtractor
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

async function luluvdoExtractor(url) {
	const client = new Client();
	const match = url.match(/(.*?:\/\/.*?)\/.*\/(.*)/);
	const headers = { 'user-agent': 'Mangayomi' };
	const res = await client.get(`${match[1]}/dl?op=embed&file_code=${match[2]}`, headers);
	return await jwplayerExtractor(res.body, headers);
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

_streamTapeExtractor = streamTapeExtractor;
streamTapeExtractor = async (url) => {
	return await _streamTapeExtractor(url, '');
}

//--------------------------------------------------------------------------------------------------
//  Video Extractor Helpers
//--------------------------------------------------------------------------------------------------

async function extractAny(url, method, lang, type, host, headers = null) {
	const m = extractAny.methods[method];
	return (!m) ? [] : (await m(url, headers)).map(v => {
		v.quality = v.quality ? `${lang} ${type} ${v.quality} ${host}` : `${lang} ${type} ${host}`;
		return v;
	});
};

extractAny.methods = {
	'doodstream': doodExtractor,
	'filemoon': filemoonExtractor,
	'luluvdo': luluvdoExtractor,
	'okru': okruExtractor,
	'streamtape': streamTapeExtractor,
	'streamwish': vidHideExtractor,
	'vidhide': vidHideExtractor,
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

function sortVideos(videos) {
	const pref = new SharedPreferences();

	// Expresiones regulares para extraer el número de resolución (ej: "720p")
	const resolutionRegex = new RegExp('(\\d+)[pP]');
	const langRegex = new RegExp(pref.get('lang'), 'i');
	const typeRegex = new RegExp(pref.get('type'), 'i');

	const prefResMatch = resolutionRegex.exec(pref.get('res'));
	const resRegex = prefResMatch ? new RegExp(prefResMatch[1], 'i') : null;

	const hostRegex = new RegExp(pref.get('host'), 'i');

	// Función que asigna una puntuación de preferencia a partir de la calidad.
	const getScore = (quality) => {
		const langScore = langRegex.test(quality) ? 1 : 0;
		const typeScore = typeRegex.test(quality) ? 1 : 0;
		const resScore = resRegex && resRegex.test(quality) ? 1 : 0;
		const hostScore = hostRegex.test(quality) ? 1 : 0;

		// Se asignan pesos: mayor prioridad al idioma, seguido del tipo, resolución y host.
		return (langScore * 8) + (typeScore * 4) + (resScore * 2) + (hostScore * 1);
	}

	return videos.sort((a, b) => {
		const scoreA = getScore(a.quality);
		const scoreB = getScore(b.quality);

		if (scoreA !== scoreB) {
			return scoreB - scoreA;
		}

		// Si los puntajes son iguales, compara la resolución numérica descendente
		const resMatchA = resolutionRegex.exec(a.quality);
		const resMatchB = resolutionRegex.exec(b.quality);
		const resA = resMatchA ? parseInt(resMatchA[1]) : 0;
		const resB = resMatchB ? parseInt(resMatchB[1]) : 0;

		if (resA !== resB) {
			return resB - resA;
		}

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