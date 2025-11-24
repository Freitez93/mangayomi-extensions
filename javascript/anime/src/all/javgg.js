const mangayomiSources = [
	{
		"name": "JavGG",
		"lang": "all",
		"baseUrl": "https://javgg.net",
		"apiUrl": "",
		"iconUrl": "https://javgg.net/favicon.png",
		"typeSource": "single",
		"itemType": 1,
		"isNsfw": true,
		"version": "1.0.4",
		"pkgPath": "anime/src/all/javgg.js"
	}
];

class DefaultExtension extends MProvider {
	async request(url) {
		try {
			const assembleURL = absUrl(url, "https://javgg.net/");

			return await new Client({ 'useDartHttpClient': true }).get(assembleURL);
		} catch (error) {
			console.log('Error en request: ' + error.message)
		}
	}

	async getItems(url) {
		const res = await this.request(url);
		const doc = new Document(res.body);
		const elements = doc.select('article');

		const items = [];
		for (const element of elements) {
			const cover = element.selectFirst('img').attr('src');
			const title = element.selectFirst('img').attr('alt');
			const url = element.selectFirst('a').attr('href').replace('https://javgg.net', '');
			items.push({
				link: url,
				imageUrl: cover,
				name: title
			});
		}
		return {
			list: items,
			hasNextPage: true
		}
	}

	async getPopular(page) {
		return await this.getItems(`/trending/page/${page}/?sort=today`);
	}

	async getLatestUpdates(page) {
		return await this.getItems(`/new-post/page/${page}`);
	}

	async search(query, page, filters) {
		if (query == "") {
			var category, sort;
			for (const filter of filters) {
				if (filter["type"] == "CateFilter") {
					category = filter["values"][filter["state"]]["value"];
				} else if (filter["type"] == "SortFilter") {
					sort = filter["values"][filter["state"]]["value"];
				}
			}
			return await this.getItems(`/${category}/page/${page}/?view=${sort}`);
		} else {
			return await this.getItems(`/jav/page/${page}?s=${query}`);
		}
	}

	async getDetail(url) {
		try {
			const res = await this.request(url);
			const doc = new Document(res.body);

			const name = doc.selectFirst('meta[property="og:image:alt"]').attr('content');
			const imageUrl = doc.selectFirst('meta[property="og:image"]').attr("content");
			const description = doc.selectFirst('meta[property="og:description"]').attr('content');
			const dataTime = doc.selectFirst('.date[itemprop]').text;

			const genre = []
			var author = ""
			doc.select('#Cast a[rel="tag"]').map(ele => {
				const check = ele.attr('href')
				if (check.includes('maker')) {
					author = check.split('/')[4]
				} else if (check.includes('genre')) {
					genre.push(check.split('/')[4])
				}
			})

			return {
				name,
				link: `https://javgg.net${url}`,
				imageUrl,
				description,
				author,
				status: 1,
				genre,
				chapters: [
					{
						name: 'Watch',
						url: url,
						dateUpload: this.parseDateString(dataTime).toString()
					}
				]
			};
		} catch (error) {
			throw new Error(error.message)
		}
	}

	async getVideoList(url) {
		try {
			const response = await this.request(url);
			const doc = new Document(response.body);

			const name = doc.selectFirst('meta[property="og:image:alt"]').attr('content')
			const type = name.includes('Subtitle') ? 'Sub' : 'Raw'

			const hostToNameMap = {
				"jav-vids.xyz": "VidHide",
				"javggvideo.xyz": "TurboPlay",
				"javstreamhg.xyz": "StreamWish",
				"javguard.club": 'VidGuard'
			};

			const hostRegex = /^https?:\/\/([^\/?#]+)/;

			// Procesamiento principal de servidores
			const servers = doc.select('#playaa').map(src => {
				const url = src.attr('src');
				const host = url.match(hostRegex)?.[1] ?? null;

				// Lógica de nombre de servidor
				const serverName = hostToNameMap[host] ?? null;
				if (serverName !== null) {
					return {
						server: serverName,
						method: serverName.toLowerCase(),
						url: url
					};
				}
			}).filter(Boolean);

			// Mapeo de promesas con parámetros corregidos
			const promises = servers.map(({ server, method, url }) =>
				extractAny(url, method, 'Japonés', type, server)
			);

			// Manejo de promesas
			const results = await Promise.allSettled(promises);

			// Filtrar y aplanar los resultados cumplidos
			const videos = results
				.filter(p => p.status === 'fulfilled')
				.flatMap(p => p.value);

			// Retornar los videos ordenados por Preferencias
			return sortVideos(videos);
		} catch (error) {
			throw new Error(`Error getVideoList: ${error.message ?? 'Unknown error'}`);
		}
	}

	getFilterList() {
		return [
			{
				type_name: "HeaderFilter",
				name: "El filtro se ignora cuando se utiliza la búsqueda de texto.",
			},
			{
				"type": "CateFilter",
				"name": "Category",
				"type_name": "SelectFilter",
				"values": [
					{
						"value": "tag/hd-uncensored",
						"name": "HD Uncensored",
						"type_name": "SelectOption"
					},
					{
						"value": "tag/uncensored-leak",
						"name": "Uncensored Leaked",
						"type_name": "SelectOption"
					},
					{
						"value": "tag/decensored",
						"name": "Decensored",
						"type_name": "SelectOption"
					},
					{
						"value": "genre/vr",
						"name": "VR",
						"type_name": "SelectOption"
					},
					{
						"value": "genre/fc2pvv",
						"name": "FC2PVV",
						"type_name": "SelectOption"
					},
					{
						"value": "genre/housewife-housewife",
						"name": "HouseWife",
						"type_name": "SelectOption"
					},
					{
						"value": "genre/threesome-foursome",
						"name": "Threesome / Foursome",
						"type_name": "SelectOption"
					},
					{
						"value": "genre/1pon",
						"name": "1pondo",
						"type_name": "SelectOption"
					},
					{
						"value": "genre/cuckold",
						"name": "Cuckold",
						"type_name": "SelecOption"
					},
					{
						"value": "genre/cuckold-cuckold-ntr",
						"name": "Ntr",
						"type_name": "SelectOption"
					},
					{
						"value": "genre/shotacon",
						"name": "Shotacon",
						"type_name": "SelectOption"
					},
					{
						"value": "genre/swingers",
						"name": "Swingers",
						"type_name": "SelectOption"
					},
					{
						"value": "genre/slut",
						"name": "Slut",
						"type_name": "SelectOption"
					},
					{
						"value": "genre/adopted-daughter",
						"name": "Adopted Daughter",
						"type_name": "SelectOption"
					},
					{
						"value": "genre/av-idol",
						"name": "AV Idol",
						"type_name": "SelectOption"
					},
					{
						"value": "genre/drug",
						"name": "Drug",
						"type_name": "SelectOption"
					},
					{
						"value": "genre/miniskirt",
						"name": "Miniskirt",
						"type_name": "SelectOption"
					},
					{
						"value": "genre/orgy",
						"name": "Orgy",
						"type_name": "SelectOption"
					},
					{
						"value": "genre/sister",
						"name": "Sister",
						"type_name": "SelectOption"
					},
					{
						"value": "genre/stepfamily",
						"name": "StepFamily",
						"type_name": "SelectOption"
					},
					{
						"value": "genre/voyeurism",
						"name": "Voyeurism",
						"type_name": "SelectOption"
					},
					{
						"value": "genre/voyeur-peeping",
						"name": "Voyeur/Peeping",
						"type_name": "SelectOption"
					},
					{
						"value": "genre/young",
						"name": "Young",
						"type_name": "SelectOption"
					},
					{
						"value": "genre/widow",
						"name": "Widow",
						"type_name": "SelectOption"
					}
				]
			},
			{
				"type": "SortFilter",
				"name": "Sort",
				"type_name": "SelectFilter",
				"values": [
					{
						"value": "all",
						"name": "All",
						"type_name": "SelectOption"
					},
					{
						"value": "monthly",
						"name": "Most viewed Monthly",
						"type_name": "SelectOption"
					},
					{
						"value": "weekly",
						"name": "Most viewed Weekly",
						"type_name": "SelectOption"
					},
					{
						"value": "today",
						"name": "Most viewed today",
						"type_name": "SelectOption"
					}
				]
			}
		];

	}

	getSourcePreferences() {
		const languages = ['Default'];
		const types = ['Default'];
		const resolutions = [
			'1080p',
			'720p',
			'480p'
		];
		const hosts = [
			'StreamWish',
			'TurboPlay',
			'VidHide',
			'voe'
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

	parseDateString(dateString) {
		// Objeto para mapear los nombres de los meses a números
		const monthMap = {
			"Jan.": 0, "Feb.": 1, "Mar.": 2, "Apr.": 3,
			"May.": 4, "Jun.": 5, "Jul.": 6, "Aug.": 7,
			"Sep.": 8, "Oct.": 9, "Nov.": 10, "Dec.": 11
		};

		// Dividir la cadena en partes usando espacio como separador
		const parts = dateString.split(' ');

		// Extraer el mes, día y año
		const monthName = parts[0]; // Ejemplo: "Feb."
		const day = parseInt(parts[1].replace(',', ''), 10); // Eliminar la coma y convertir a número
		const year = parseInt(parts[2], 10); // Convertir el año a número

		// Obtener el número del mes usando el mapa
		const month = monthMap[monthName];

		// Crear y retornar un objeto Date
		return new Date(year, month, day).getTime();
	}
}

/***************************************************************************************************
* 
*   mangayomi-js-helpers (Editado con solo lo que esta extencion nesecita)
*       
*   # Video Extractors
*       - vidHideExtractor
*       - turboPlayExtractor
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
*   # Url
*       - absUrl()
*
***************************************************************************************************/

//--------------------------------------------------------------------------------------------------
//  Video Extractors
//--------------------------------------------------------------------------------------------------

async function vidHideExtractor(url, headers = {}) {
	headers = headers || {
		'Referer': url,
		'Accept-Language': 'es-ES,es;q=0.8',
		'User-Agent': 'Mozilla/ 5.0(Windows NT 10.0; Win64; x64) AppleWebKit / 537.36(KHTML, like Gecko) Chrome / 142.0.0.0 Safari / 537.36'
	}

	try {
		// Fetch HTML
		const response = await new Client().get(url);
		const html = response.body;

		// Unpack obfuscated JS
		const unpacked = unpackJs(html);
		if (!unpacked) {
			throw new Error("Failed to unpack JavaScript.");
		}

		// Extract and parse links
		const linksMatch = unpacked.substringBetween('links={', '}');
		if (!linksMatch) {
			throw new Error("No links found in unpacked JavaScript.");
		}

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
						link = `https://vidhide.com${link}`
					}
					const extracted = await m3u8Extractor(link, headers);
					videos.push(...extracted);
				} catch (e) {
					console.error(`Failed to extract m3u8: ${link}`, e);
				}
			} else if (link.includes('.mpd')) {
				// Placeholder for DASH support
				console.warn('DASH (.mpd) support not implemented');
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
		console.error("Error in streamHideExtractor:", error);
		return [];
	}
}

async function turboPlayExtractor(url, headers = {}) {
	headers = headers || {
		'Referer': url,
		'Accept-Language': 'es-ES,es;q=0.8',
		'User-Agent': 'Mozilla/ 5.0(Windows NT 10.0; Win64; x64) AppleWebKit / 537.36(KHTML, like Gecko) Chrome / 142.0.0.0 Safari / 537.36'
	}

	try {
		// Fetch HTML
		const response = await new Client().get(url, headers);
		const html = response.body;

		// Extract and parse links
		const linksMatch = html.substringBetween("urlPlay = ", ";");
		if (!linksMatch) {
			throw new Error("No links found in HTML.");
		}

		// Process links
		const videos = [];
		if (linksMatch.includes('.m3u8')) {
			try {
				const extracted = await m3u8Extractor(linksMatch, headers);
				videos.push(...extracted);
			} catch (e) {
				console.error(`Failed to extract m3u8: ${linksMatch}`, e.message);
			}
		} else if (linksMatch.includes('.mpd')) {
			// Placeholder for DASH support
			console.warn('DASH (.mpd) support not implemented');
		} else {
			videos.push({
				url: linksMatch,
				originalUrl: linksMatch,
				quality: '',
				headers: headers
			});
		}
		return videos;
	} catch (error) {
		console.error("Error in turboPlayExtractor:", error);
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
	'vidhide': vidHideExtractor,
	'turboplay': turboPlayExtractor,
	'streamwish': vidHideExtractor,
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