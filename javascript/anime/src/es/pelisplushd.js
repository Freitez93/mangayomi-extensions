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
		"version": "1.0.7",
		"dateFormat": "d/M/yyyy",
		"dateFormatLocale": "es_mx",
		"pkgPath": "anime/src/es/pelisplushd.js"
	}
];

class DefaultExtension extends MProvider {
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
		const metaURL = await this.getCineMetaURL(detailRes.body, isMovie)

		// CineMeta data.
		var cineMeta = null
		if (metaURL) {
			const cineMetaRes = await new Client().get(metaURL)
			cineMeta = JSON.parse(cineMetaRes.body).meta
		}

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
				name: "Reproducir Pelicula",
				url: url,
				thumbnailUrl: cineMeta?.background ?? "",
				dateUpload: date_num,
				duration: cineMeta?.runtime?.split(" ")[0] ?? ""
			})
		} else {
			const list_episodes = detailDoc.select('div[role="tabpanel"] > a')
			list_episodes.map(item => {
				const [x, s, e] = item.getHref?.match(/\/temporada\/(\d+)\/capitulo\/(\d+)/);
				const metaEps = cineMeta?.videos.find(video =>
					video.season == s && video.episode == e
				);

				episodes.push({
					name: item.text.replace(/\s+/g, ' ').trim(),
					url: item.getHref,
					thumbnailUrl: metaEps?.thumbnail ?? "",
					dateUpload: String(new Date(metaEps?.released).getTime()),
					description: metaEps?.overview
				})
			})
		}

		return {
			name: title,
			link: url,
			imageUrl: image,
			description: texts,
			status: this.parseStatus(cineMeta?.status),
			genre: genre,
			author: cineMeta?.director[0] ?? null,
			artist: cineMeta?.cast?.join(", ") ?? null,
			episodes: episodes.reverse()
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
					sources.push({ url: link, method: 'UqLink', lang: 'Latino', server: 'PelisPlus' })
				} else if (link?.includes('waaw')){
					console.log('Metodo de WaaW no Implementado.')
					// No implementado.
				}
			}

			// Mapear cada video a una promesa de extracción
			const promises = sources.map(video => {
				return extractAny(video.url, video.method, video.lang, video.method, video.server);
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
		const resolutions = ['1080p', '720p', '480p'];
		const hosts = [
			"StreamWish",
			//"StreamTape",
			//"DoodStream",
			//"StreamLare",
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
					entries: ['Latino', 'Español', 'Subtitulado'],
					entryValues: ['LAT', 'SPA', 'SUB']
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

	// ----------------------------------- //
	//        Funciones Auxiliares         //
	// ----------------------------------- //

	// Peticiones en PelisPlusHD
	async requestPlus(url) {
		const DOMAIN_API = "https://PelisPlusHD.bz/";
		try {
			const assembleURL = absUrl(url, DOMAIN_API);
			return await new Client({ 'useDartHttpClient': true }).get(assembleURL);
		} catch (error) {
			console.log('Error en request: ' + error.message)
		}
	}

	// Scrapear las Peliculas/Series/Anime
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
					name: title?.substringBeforeLast(' (').trim(),
					imageUrl: cover,
					link: _link
				})
			})
			return { list: movies, hasNextPage: nextPage }
		} catch (error) {
			throw new Error(`scrapUrl: ${error ?? error.message}`)
		}
	}

	// Armar la URL con filtros.
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
		var href = isType + isPage
		if (on['GenreFilter']){
			href = `/generos/${on['GenreFilter'] + isType + isPage}`
			if (on['GenreFilter'] == 'Dorama') {
				href = `/generos/dorama${isPage}`
			}
		} else if (on['YearFilter']){
			href = `/year/${on['YearFilter'] + isType + isPage}`
		}

		// Retornamos el href ya contruido.
		return href;
	}

	// Extractor de links para Embed69
	async decryptLinksByEmbed69(embed69Link) {
		const name = "Embed69"
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
						lang: language,
						server: name
					})
				}
			}
			return source
		} catch (error) {
			console.error(`Error decrypting links: ${error}`);
			return [];
		}
	}

	// Extractor de Links para Xupalace
	async xupalaceExtractor(xupalaceLink){
		const name = "Xupalace"
		const dartClient = new Client()
		const source = []

		try {
			const dataRes = await dartClient.get(xupalaceLink)
			const dataDoc = new Document(dataRes.body)
			dataDoc.select('.OD_1 > li').map(item => {
				let language = item.attr('data-lang')
				source.push({
					url: item.attr('onclick').substringBetween("('", "',"),
					method: renameHost[item.selectFirst('span').text.trim()] ?? 'Unknown',
					lang: renameLang[language] ?? language,
					server: name
				})
			})
			return source
		} catch (error) {
			console.error(`Error extracted links: ${error}`);
			return [];
		}
	}

	// Extraer el IMDb ID de la Pelicula/Serie/Anime/
	async getCineMetaURL(document, isMovie){
		try {
			const pattern = /tt\d{7,8}/;
			var IMDb_ID = document.match(pattern)?.[0]
			if (!IMDb_ID) {
				const pageDoc = new Document(document)
				const episode = pageDoc.selectFirst("#pills-vertical-1 > a").attr("href")
				const pageRes = await new Client().get(episode)
				IMDb_ID = pageRes.body.match(pattern)?.[0]
				if(!IMDb_ID) return null
			}
			return isMovie 
				? `https://cinemeta-live.strem.io/meta/movie/${IMDb_ID}.json`
				: `https://cinemeta-live.strem.io/meta/series/${IMDb_ID}.json`
		} catch (error) {
			console.error(`getCineMetaURL: ${error}`)
			return null
		}
	}

	// Determina el estado de la Pelicula/Serie/Anime
	parseStatus(status) {
		//  0 => "ongoing", 1 => "complete", 2 => "hiatus", 3 => "canceled", 4 => "publishingFinished", 5 => unknow
		const statusMap = {
			'Released': 0,
			'Continuing': 0,
			'Ended': 1,
			'Returning Series': 2,
			'Canceled': 3
		}

		return status ? (statusMap[status] ?? 1) : 1;
	}
}

const renameLang = {
	'0': 'LAT',
	'1': 'SPA',
	'2': 'SUB',
	'LAT': 'LAT',
	'SPA': 'SPA',
	'SUB': 'SUB',
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
*       - filemoonExtractor
*       - luluvdoExtractor
*       - streamHideExtractor
*       - voeExtractorTwo
*   
*   # Video Extractor Wrappers
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
*   # Encode/Decode Functions
*       - decodeBase64  - Funcion alternativa a atob.
*       - decryptF7     - Funcion para decodificar los links de Voe.
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
	const domain = url.split('/')[2];
	const headers = { 
		"Accept": "*/*", 
		'Referer': domain, 
		"Origin": domain, 
		'verifypeer': false, 
		'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:71.0) Gecko/20100101 Firefox/77.0' 
	};

	try {
		const html = (await new Client({ 'useDartHttpClient': true }).get(url, headers)).body;
		const match = unpackJs(html)?.substringBetween('links={', '};');
		if (!match) return [];

		const videos = [];
		for (const link of Object.values(JSON.parse(`{${match}}`))) {
			if (typeof link !== 'string') continue;
			if (link.includes('master.m3u8')) {
				try {
					const fixLink = link.startsWith('/stream/') ? `https://${domain}${link}` : link;
					videos.push(...await m3u8Extractor(fixLink, headers));
				} catch (e) { console.error(`No se pudo extraer m3u8: ${link}`, e); }
			} else {
				videos.push({ url: link, originalUrl: link, quality: '', headers });
			}
		}
		return videos;
	} catch (e) {
		console.error(`Error en streamHideExtractor: ${e}`);
		return [];
	}
}

async function voeExtractorTwo(url, headers) {
	const name = "Voe";
	const mainUrl = "https://voe.sx";
	const redirectRegex = /window\.location\.href\s*=\s*'([^']+)';/;
	const _headers = {
		"Accept": "*/*", 
		"Referer": mainUrl,
		"Origin": mainUrl, 
	}

	const dartClient = new Client({'useDartHttpClient': true})
	try {
		let voeRes = await dartClient.get(url, _headers);
		let redirectUrl = voeRes.body.match(redirectRegex)?.[1];
		if (redirectUrl) {
			voeRes = await dartClient.get(redirectUrl, _headers);
		}

		const scriptMatch = voeRes.body.match(/<script type="application\/json">([^<]+)<\/script>/);
		if (!scriptMatch) throw Error("ScriptEncoded no encontrado");
	
		const scriptContent = scriptMatch[1].substringBetween('["', '"]');
		const decryptedJson = decryptF7(scriptContent);
        const m3u8 = decryptedJson.source;
        const mp4 = decryptedJson.direct_access_url;

		const videos = [];
		if (m3u8) {
			videos.push(...await m3u8Extractor(m3u8, _headers));
		}
		if (mp4) {
			videos.push({ url: mp4, originalUrl: mp4, quality: 'MP4', headers: _headers })
		}
		return videos
	} catch (e) {
		console.error(`Error en voeExtractorTwo: ${e}`);
		return [];
	}
}

//--------------------------------------------------------------------------------------------------
//  Video Extractor Wrappers
//--------------------------------------------------------------------------------------------------

//_streamTapeExtractor = streamTapeExtractor;
//streamTapeExtractor = async (url) => {
//	return await _streamTapeExtractor(url, '');
//}

//--------------------------------------------------------------------------------------------------
//  Video Extractor Helpers
//--------------------------------------------------------------------------------------------------

async function extractAny(url, method, lang, host, server = "PelisPlus", headers = null) {
	const m = extractAny.methods[method.toLowerCase()];
	return (!m) ? [] : (await m(url, headers)).map(v => {
		v.quality = v.quality ? `${server} [${lang} : ${host}] ${v.quality}` : `${server} [${lang} : ${host}]`;
		return v;
	});
};

extractAny.methods = {
	'streamwish': streamHideExtractor,
	//'streamtape': streamTapeExtractor,
	'doodstream': doodExtractor,
	'filemoon': filemoonExtractor,
	'vidhide': streamHideExtractor,
	'uqlink': uqLinkExtractor,
	'okru': okruExtractor,
	'voe': voeExtractorTwo
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
	const disp = preferences.get("pref_resolution")?.replace(/p/i, '');
	const host = preferences.get("pref_host");

	const getScore = (quality) => {
		if (!quality) return 0; // Retorna 0 si no hay valor.

		const qLower = quality.toLowerCase();
		const langScore = lang && qLower.includes(lang.toLowerCase()) ? 4 : 0;
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
//  Encode/Decode Functions
//--------------------------------------------------------------------------------------------------
function decodeBase64(str) {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
	const map = chars.split('').reduce((m, c, i) => (m[c] = i, m), {});
	let bits = 0, count = 0, result = '';

	str.replace(/=/g, '').split('').forEach(c => {
		bits = (bits << 6) | map[c];
		count += 6;
		while (count >= 8)
			result += String.fromCharCode((bits >>> (count -= 8)) & 0xFF);
	});
	return result;
}

function decryptF7(p8) {
    const rot13 = input => {
        return input.replace(/[a-zA-Z]/g, function(c) {
            const code = c.charCodeAt(0);
            const offset = code <= 90 ? 65 : 97;
            return String.fromCharCode(((code - offset + 13) % 26) + offset);
        });
    }
    const replacePatterns = input => {
        const patterns = ["@\\$", "\\^\\^", "~@", "%\\?", "\\*~", "!!", "#&"];
        patterns.forEach(pattern => {
            const regex = new RegExp(pattern, "g");
            input = input.replace(regex, "_");
        });
        return input;
    }
    const charShift = (input, shift) => {
        return input.split('').map(c => 
            String.fromCharCode(c.charCodeAt(0) - shift)
        ).join('');
    }
    try {
        let vF = rot13(p8);
        vF = replacePatterns(vF);
        vF = vF.replace(/_/g, "");
        vF = decodeBase64(vF);
        vF = charShift(vF, 3);
        vF = vF.split('').reverse().join('');
        return JSON.parse(decodeBase64(vF));
    } catch (e) {
        console.log("Decryption error: " + e.message);
        return {};
    }
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