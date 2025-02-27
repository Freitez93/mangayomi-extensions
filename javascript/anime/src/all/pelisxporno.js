const mangayomiSources = [
	{
		"name": "PelisXPorno",
		"lang": "all",
		"baseUrl": "https://www.pelisxporno.net",
		"apiUrl": "",
		"iconUrl": "https://www.pelisxporno.net/wp-content/uploads/2022/11/favicon.png",
		"typeSource": "single",
		"itemType": 1,
		"isNsfw": true,
		"version": "0.0.1",
		"dateFormat": "",
		"dateFormatLocale": "",
		"pkgName": "anime/src/all/pelisxporno.js"
	}
];

class DefaultExtension extends MProvider {
	async requestPlus(url) {
		const baseUrl = this.source.baseUrl;
		const response = await new Client().get(baseUrl + url, {
			Referer: baseUrl,
		});

		return response.body;
	}

	async getPopular(page) {
		return await this.search(false, page, false, 'popular');
	}

	async getLatestUpdates(page) {
		return await this.search(false, page, false, 'latest');
	}

	async search(query, page, filters, extra) {
		let searchUrl = `/page/${page}/?filter=${extra}`

		if (query) {
			searchUrl = `/page/${page}/?s=${query.replaceAll(" ", "+")}`
		} else if (filters) {

			// Filtro por Categoria
			if (filters[0].state !== 0) {
				const isValue = filters[0].values?.[filters[0].state].value || filters[0].state;
				searchUrl = `/${isValue}/page/${page}/`;
			}

			// Orden
			if (filters[1].state !== 0) {
				const isValue = filters[1].values?.[filters[1].state].value || filters[1].state;
				searchUrl = searchUrl + `?filter=${isValue}`
			}
		}

		const searchRes = await this.requestPlus(searchUrl);
		const searchDoc = new Document(searchRes);
		const elements = searchDoc.select(".videos-list > article");
		const hasNext = searchDoc.selectFirst('.pagination > ul > li:last-child > a').text

		const movies = [];
		for (const element of elements) {
			movies.push({
				name: element.selectFirst("span.title").text,
				imageUrl: 'https:' + element.selectFirst("img").attr("data-src"),
				link: element.selectFirst('a').attr("href").split(".net")[1]
			})
		}

		return {
			list: movies,
			hasNextPage: hasNext === 'Next' || hasNext === 'Last'
		}
	}
	async getDetail(url) {
		const detailRes = await this.requestPlus(url);
		const detailDoc = new Document(detailRes);

		//------- Informacion de la Pelicula/Serie
		const title = detailDoc.selectFirst('meta[property="og:title"]').attr('content')
		const cover = detailDoc.selectFirst('meta[property="og:image"]').attr('content')
		const desc = detailDoc.selectFirst('meta[property="og:description"]').attr('content').trim();
		const director = detailDoc.selectFirst('.desc > table a').text
		const artistas = detailDoc.select('tbody > tr:last-child > td[align="left"] > a').map(e => e.text)
		const genre = detailDoc.select(".tags-list > a").map(e => e.text.trim())

		//------- Variables del Script
		const episodes = [{
			name: "Pelicula",
			url: url
		}]

		return {
			name: title,
			imageUrl: cover,
			description: desc,
			author: director,
			//artist: artistas.toString(),
			status: 1,
			genre: genre,
			episodes: episodes
		}
	}

	// For anime episode video list
	async getVideoList(url) {
		const videoRes = await this.requestPlus(url);
		const videoDoc = new Document(videoRes)
		const embedURL = videoDoc.selectFirst('meta[itemprop="embedURL"]').attr('content')

		const title = videoDoc.selectFirst('meta[property="og:title"]').attr('content')
		const host = embedURL.split('/')[2].split('.')[0]
		const renameLUT = { 'dooodster': 'DoodStream', 'dood': 'DoodStream', 'd000d': 'DoodStream' };
		const method = renameLUT[host] ?? host
		const audio = title.includes('Español') ? 'Español' : 'English'
		const type = audio === 'Español' ? 'Dub' : 'RAW'

		const videos = await extractAny(embedURL, method.toLowerCase(), audio, type, method);

		return sortVideos(videos);
	}

	getFilterList() {
		return [
			{
				type: "GenreFilter",
				name: "Categoria",
				values: [
					{
						name: "< Seleccione un Genero >",
						value: "0",
						type_name: "SelectOption",
					},
					{
						name: "Abuelas",
						value: "Abuelas",
						type_name: "SelectOption",
					},
					{
						name: "Amateurs",
						value: "amateurs",
						type_name: "SelectOption",
					},
					{
						name: "Asiaticas",
						value: "asiaticas",
						type_name: "SelectOption",
					},
					{
						name: "Belladonna",
						value: "belladonna",
						type_name: "SelectOption",
					},
					{
						name: "Bisexuales",
						value: "bisexuales",
						type_name: "SelectOption",
					},
					{
						name: "BlackMassiveCocks",
						value: "blackmassivecocks",
						type_name: "SelectOption",
					},
					{
						name: "Brazzers en Español",
						value: "brazzers-en-espanol-gratis",
						type_name: "SelectOption",
					},
					{
						name: "Bukkake",
						value: "bukkake",
						type_name: "SelectOption",
					},
					{
						name: "Castings",
						value: "castings",
						type_name: "SelectOption",
					},
					{
						name: "Clásico",
						value: "clasico",
						type_name: "SelectOption",
					},
					{
						name: "Cuckold",
						value: "cuckold",
						type_name: "SelectOption",
					},
					{
						name: "Culazos",
						value: "culazos",
						type_name: "SelectOption",
					},
					{
						name: "Curas y Monjas",
						value: "curas-y-monjas",
						type_name: "SelectOption",
					},
					{
						name: "Doble penetración",
						value: "doble-penetracion",
						type_name: "SelectOption",
					},
					{
						name: "Embarazadas",
						value: "embarazadas",
						type_name: "SelectOption",
					},
					{
						name: "Enfermeras",
						value: "enfermeras",
						type_name: "SelectOption",
					},
					{
						name: "Erotismo",
						value: "erotismo",
						type_name: "SelectOption",
					},
					{
						name: "Escena español",
						value: "escena-espanol",
						type_name: "SelectOption",
					},
					{
						name: "Escena Inglés",
						value: "escena-ingles",
						type_name: "SelectOption",
					},
					{
						name: "Famosas",
						value: "famosas",
						type_name: "SelectOption",
					},
					{
						name: "Gamer",
						value: "gamer",
						type_name: "SelectOption",
					},
					{
						name: "Gangbang",
						value: "gangbang",
						type_name: "SelectOption",
					},
					{
						name: "Gordas",
						value: "gordas",
						type_name: "SelectOption",
					},
					{
						name: "Hentai Español",
						value: "hentai-espanol",
						type_name: "SelectOption",
					},
					{
						name: "Hentai Sub Español",
						value: "hentai-sub-espanol",
						type_name: "SelectOption",
					},
					{
						name: "Incesto",
						value: "incesto",
						type_name: "SelectOption",
					},
					{
						name: "Infidelidades",
						value: "infidelidades",
						type_name: "SelectOption",
					},
					{
						name: "Interracial",
						value: "interracial",
						type_name: "SelectOption",
					},
					{
						name: "Jovencitas",
						value: "jovencitas",
						type_name: "SelectOption",
					},
					{
						name: "Latinas",
						value: "latinas",
						type_name: "SelectOption",
					},
					{
						name: "Lesbianas",
						value: "lesbianas",
						type_name: "SelectOption",
					},
					{
						name: "Madre e hija",
						value: "madre-e-hija",
						type_name: "SelectOption",
					},
					{
						name: "Maduras",
						value: "maduras",
						type_name: "SelectOption",
					},
					{
						name: "Mamadas",
						value: "mamadas",
						type_name: "SelectOption",
					},
					{
						name: "Marc Dorcel",
						value: "marc-dorcel",
						type_name: "SelectOption",
					},
					{
						name: "Mario Salieri",
						value: "mario-salieri",
						type_name: "SelectOption",
					},
					{
						name: "Masturbaciones",
						value: "masturbaciones",
						type_name: "SelectOption",
					},
					{
						name: "MyGF",
						value: "mygf",
						type_name: "SelectOption",
					},
					{
						name: "Orgías",
						value: "orgias",
						type_name: "SelectOption",
					},
					{
						name: "Parodia",
						value: "parodia",
						type_name: "SelectOption",
					},
					{
						name: "Pelicula En Español",
						value: "pelicula-en-espanol",
						type_name: "SelectOption",
					},
					{
						name: "Pelicula En Ingles",
						value: "pelicula-en-ingles",
						type_name: "SelectOption",
					},
					{
						name: "Peludas",
						value: "peludas",
						type_name: "SelectOption",
					},
					{
						name: "Pornostars",
						value: "pornostars",
						type_name: "SelectOption",
					},
					{
						name: "Private",
						value: "private",
						type_name: "SelectOption",
					},
					{
						name: "Rocco Siffredi",
						value: "rocco-siffredi",
						type_name: "SelectOption",
					},
					{
						name: "Sado",
						value: "sado",
						type_name: "SelectOption",
					},
					{
						name: "Sexo Anal",
						value: "sexo-anal",
						type_name: "SelectOption",
					},
					{
						name: "Sexo Extremo",
						value: "sexo-extremo",
						type_name: "SelectOption",
					},
					{
						name: "Sin categoría",
						value: "sin-categoria",
						type_name: "SelectOption",
					},
					{
						name: "Tercera edad",
						value: "tercera-edad",
						type_name: "SelectOption",
					},
					{
						name: "Tetonas",
						value: "tetonas",
						type_name: "SelectOption",
					},
					{
						name: "Trans",
						value: "trans",
						type_name: "SelectOption",
					},
					{
						name: "Transexuales",
						value: "transexuales",
						type_name: "SelectOption",
					},
					{
						name: "Tríos",
						value: "trios",
						type_name: "SelectOption",
					},
					{
						name: "Videos Españoles",
						value: "videos-espanoles",
						type_name: "SelectOption",
					},
					{
						name: "Vintage",
						value: "vintage",
						type_name: "SelectOption",
					}
				],
				type_name: "SelectFilter",
			},
			{
				type: "TypeFilter",
				name: "Orden",
				values: [
					{
						name: "Por defecto",
						value: "0",
						type_name: "SelectOption",
					},
					{
						name: "Mas nuevo",
						value: "latest",
						type_name: "SelectOption",
					},
					{
						name: "Popular",
						value: "popular",
						type_name: "SelectOption",
					},
					{
						name: "Mas vistos",
						value: "most-viewed",
						type_name: "SelectOption",
					},
					{
						name: "Mas largo",
						value: "longest",
						type_name: "SelectOption",
					},
					{
						name: "Random",
						value: "random",
						type_name: "SelectOption"
					}
				],
				type_name: "SelectFilter",
			}
		];
	}

	getSourcePreferences() {
		const languages = ['Español', 'English'];
		const types = ['Sub', 'Dub', 'RAW'];
		const resolutions = ['1080p', '720p', '480p'];
		const hosts = ['DoodStream', 'HIDE', 'YourUpload'];

		return [
			{
				key: 'lang',
				listPreference: {
					title: 'Preferred Language',
					summary: 'Si está disponible, este idioma se elegirá de forma predeterminada. Prioridad = 0 (cuanto menor, mejor).',
					valueIndex: 0,
					entries: languages,
					entryValues: languages
				}
			},
			{
				key: 'type',
				listPreference: {
					title: 'Preferred Type',
					summary: 'Si está disponible, este tipo se elegirá de forma predeterminada. Prioridad = 1 (cuanto menor, mejor).',
					valueIndex: 0,
					entries: types,
					entryValues: types
				}
			},
			{
				key: 'res',
				listPreference: {
					title: 'Preferred Resolution',
					summary: 'Si está disponible, esta resolución se elegirá de forma predeterminada. Prioridad = 2 (cuanto menor, mejor)',
					valueIndex: 0,
					entries: resolutions,
					entryValues: resolutions
				}
			},
			{
				key: 'host',
				listPreference: {
					title: 'Preferred Host',
					summary: 'Si está disponible, este proveedor de alojamiento será elegido de forma predeterminada. Prioridad = 3 (cuanto menor, mejor)',
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
*   mangayomi-js-helpers v1.2
*       
*   # Video Extractors
*       - vidGuardExtractor
*       - doodExtractor
*       - vidozaExtractor
*       - okruExtractor
*       - amazonExtractor
*       - vidHideExtractor
*       - filemoonExtractor
*       - mixdropExtractor
*       - speedfilesExtractor
*       - luluvdoExtractor
*       - burstcloudExtractor (not working, see description)
*   
*   # Video Extractor Wrappers
*       - streamWishExtractor
*       - voeExtractor
*       - mp4UploadExtractor
*       - yourUploadExtractor
*       - streamTapeExtractor
*       - sendVidExtractor
*   
*   # Video Extractor helpers
*       - extractAny
*   
*   # Playlist Extractors
*       - m3u8Extractor
*       - jwplayerExtractor
*   
*   # Extension Helpers
*       - sortVideos()
*   
*   # Uint8Array
*       - Uint8Array.fromBase64()
*       - Uint8Array.prototype.toBase64()
*       - Uint8Array.prototype.decode()
*   
*   # String
*       - String.prototype.encode()
*       - String.decode()
*       - String.prototype.reverse()
*       - String.prototype.swapcase()
*       - getRandomString()
*
*   # Encode/Decode Functions
*       - decodeUTF8
*       - encodeUTF8
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

	let decoded = Uint8Array.fromBase64(
		String.fromCharCode(...charCodes))
		.slice(5, -5)
		.reverse();

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

async function vidozaExtractor(url) {
	let response = await new Client({ 'useDartHttpClient': true, "followRedirects": true }).get(url);
	const videoUrl = response.body.match(/https:\/\/\S*\.mp4/)[0];
	return [{ url: videoUrl, originalUrl: videoUrl, quality: '' }];
}

async function okruExtractor(url) {
	const res = await new Client().get(url);
	const doc = new Document(res.body);
	const tag = doc.selectFirst('div[data-options]');
	const playlistUrl = tag.attr('data-options').match(/hlsManifestUrl.*?(h.*?id=\d+)/)[1].replaceAll('\\\\u0026', '&');
	return await m3u8Extractor(playlistUrl, null);
}

async function amazonExtractor(url) {
	const res = await new Client().get(url);
	const doc = new Document(res.body);
	const videoUrl = doc.selectFirst('video').getSrc;
	return videoUrl ? [{ url: videoUrl, originalUrl: videoUrl, headers: null, quality: '' }] : [];
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

async function mixdropExtractor(url) {
	headers = { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' };
	let res = await new Client({ 'useDartHttpClient': true, "followRedirects": false }).get(url, headers);
	while ("location" in res.headers) {
		res = await new Client({ 'useDartHttpClient': true, "followRedirects": false }).get(res.headers.location, headers);
	}
	const newUrl = res.request.url;
	let doc = new Document(res.body);

	const code = doc.selectFirst('script:contains(MDCore):contains(eval)').text;
	const unpacked = unpackJs(code);
	let videoUrl = unpacked.match(/wurl="(.*?)"/)?.[1];

	if (!videoUrl) return [];

	videoUrl = 'https:' + videoUrl;
	headers.referer = newUrl;

	return [{ url: videoUrl, originalUrl: videoUrl, quality: '', headers: headers }];
}

async function speedfilesExtractor(url) {
	let res = await new Client().get(url);
	let doc = new Document(res.body);

	const code = doc.selectFirst('script:contains(var)').text;
	let b64;

	// Get b64
	for (const match of code.matchAll(/(?:var|let|const)\s*\w+\s*=\s*["']([^"']+)/g)) {
		if (match[1].match(/[g-zG-Z]/)) {
			b64 = match[1];
			break;
		}
	}

	// decode b64 => b64
	const step1 = Uint8Array.fromBase64(b64).reverse().decode().swapcase();
	// decode b64 => hex
	const step2 = Uint8Array.fromBase64(step1).reverse().decode();
	// decode hex => b64
	let step3 = [];
	for (let i = 0; i < step2.length; i += 2) {
		step3.push(parseInt(step2.slice(i, i + 2), 16) - 3);
	}
	step3 = String.fromCharCode(...step3.reverse()).swapcase();
	// decode b64 => url
	const videoUrl = Uint8Array.fromBase64(step3).decode();

	return [{ url: videoUrl, originalUrl: videoUrl, quality: '', headers: null }];
}

async function luluvdoExtractor(url) {
	const client = new Client();
	const match = url.match(/(.*?:\/\/.*?)\/.*\/(.*)/);
	const headers = { 'user-agent': 'Mangayomi' };
	const res = await client.get(`${match[1]}/dl?op=embed&file_code=${match[2]}`, headers);
	return await jwplayerExtractor(res.body, headers);
}

/** Does not work: Client always sets 'charset=utf-8' in Content-Type. */
async function burstcloudExtractor(url) {
	let client = new Client();
	let res = await client.get(url);

	const id = res.body.match(/data-file-id="(.*?)"/)[1];
	const headers = {
		"Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
		'Referer': url,
	};
	const data = {
		'fileId': id
	};

	res = await client.post(`https://www.burstcloud.co/file/play-request/`, headers, data);
	const videoUrl = res.body.match(/cdnUrl":"(.*?)"/)[1];
	return [{
		url: videoUrl,
		originalUrl: videoUrl,
		headers: { 'Referer': url.match(/.*?:\/\/.*?\//) },
		quality: ''
	}];
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
	let res = await new Client().get(url);
	var videoUrl, quality;
	try {
		videoUrl = res.body.match(/og:video" content="(.*?\.mp4.*?)"/)[1];
		quality = res.body.match(/og:video:height" content="(.*?)"/)?.[1];
		quality = quality ? quality + 'p' : '';
	} catch (error) {

	}
	if (!videoUrl) {
		return _sendVidExtractor(url, null, '');
	}
	return [{ url: videoUrl, originalUrl: videoUrl, quality: quality, headers: null }];
}

//--------------------------------------------------------------------------------------------------
//  Video Extractor Helpers
//--------------------------------------------------------------------------------------------------

async function extractAny(url, method, lang, type, host, headers = null) {
	const m = extractAny.methods[method];
	return (!m) ? [] : (await m(url, headers)).map(v => {
		v.quality = v.quality ? `${lang} ${type} - ${v.quality} - ${host}` : `${lang} ${type} - ${host}`;
		return v;
	});
};

extractAny.methods = {
	'amazon': amazonExtractor,
	'burstcloud': burstcloudExtractor,
	'doodstream': doodExtractor,
	'filemoon': filemoonExtractor,
	'luluvdo': luluvdoExtractor,
	'mixdrop': mixdropExtractor,
	'mp4upload': mp4UploadExtractor,
	'okru': okruExtractor,
	'sendvid': sendVidExtractor,
	'speedfiles': speedfilesExtractor,
	'streamtape': streamTapeExtractor,
	'streamwish': vidHideExtractor,
	'vidguard': vidGuardExtractor,
	'vidhide': vidHideExtractor,
	'vidoza': vidozaExtractor,
	'voe': voeExtractor,
	'yourupload': yourUploadExtractor
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
	const getres = RegExp('(\\d+)p?', 'i');
	const lang = RegExp(pref.get('lang'), 'i');
	const type = RegExp(pref.get('type'), 'i');
	const res = RegExp(getres.exec(pref.get('res'))[1], 'i');
	const host = RegExp(pref.get('host'), 'i');

	let getScore = (q, hasRes) => {
		const bLang = lang.test(q), bType = type.test(q), bRes = res.test(q), bHost = host.test(q);
		if (hasRes) {
			return bLang * (8 + bType * (4 + bRes * (2 + bHost * 1)));
		} else {
			return bLang * (8 + bType * (4 + (bHost * 3)));
		}
	}

	return videos.sort((a, b) => {
		const resA = getres.exec(a.quality)?.[1];
		const resB = getres.exec(b.quality)?.[1];
		const score = getScore(b.quality, resB) - getScore(a.quality, resA);

		if (score) return score;

		const qA = resA ? a.quality.replace(resA, (9999 - parseInt(resA)).toString()) : a.quality;
		const qB = resA ? b.quality.replace(resB, (9999 - parseInt(resB)).toString()) : b.quality;

		return qA.localeCompare(qB);
	});
}

//--------------------------------------------------------------------------------------------------
//  Uint8Array
//--------------------------------------------------------------------------------------------------

Uint8Array.fromBase64 = function (b64) {
	//        [00,01,02,03,04,05,06,07,08,\t,\n,0b,0c,\r,0e,0f,10,11,12,13,14,15,16,17,18,19,1a,1b,1c,1d,1e,1f,' ', !, ", #, $, %, &, ', (, ), *, +,',', -, ., /, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, :, ;, <,'=', >, ?, @,A,B,C,D,E,F,G,H,I,J, K, L, M, N, O, P, Q, R, S, T, U, V, W, X, Y, Z, [, \, ], ^, _, `, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, r, s, t, u, v, w, x, y, z, {, |, }, ~,7f]
	const m = [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 62, -1, 62, -1, 63, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, -1, -1, -1, -1, -1, -1, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, -1, -1, -1, -1, 63, -1, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, -1, -1, -1, -1, -1]
	let data = [], val = 0, bits = -8
	for (const c of b64) {
		let n = m[c.charCodeAt(0)];
		if (n == -1) break;
		val = (val << 6) + n;
		bits += 6;
		for (; bits >= 0; bits -= 8)
			data.push((val >> bits) & 0xFF);
	}
	return new Uint8Array(data);
}

Uint8Array.prototype.toBase64 = function () {
	const m = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
	let b64 = '', val = 0, bits = -6;
	for (const b of this) {
		val = (val << 8) + b;
		bits += 8;
		while (bits >= 0) {
			b64 += m[(val >> bits) & 0x3F];
			bits -= 6;
		}
	}
	if (bits > -6)
		b64 += m[(val << -bits) & 0x3F];
	return b64 + ['', '', '==', '='][b64.length % 4];
}

Uint8Array.prototype.decode = function (encoding = 'utf-8') {
	encoding = encoding.toLowerCase();
	if (encoding == 'utf-8') {
		return decodeUTF8(this);
	}
	return null;
}

//--------------------------------------------------------------------------------------------------
//  String
//--------------------------------------------------------------------------------------------------

String.prototype.encode = function (encoding = 'utf-8') {
	encoding = encoding.toLowerCase();
	if (encoding == 'utf-8') {
		return encodeUTF8(this);
	}
	return null;
}

String.decode = function (data, encoding = 'utf-8') {
	encoding = encoding.toLowerCase();
	if (encoding == 'utf-8') {
		return decodeUTF8(data);
	}
	return null;
}

String.prototype.reverse = function () {
	return this.split('').reverse().join('');
}

String.prototype.swapcase = function () {
	const isAsciiLetter = /[A-z]/;
	const result = [];
	for (const l of this)
		result.push(isAsciiLetter.test(l) ? String.fromCharCode(l.charCodeAt() ^ 32) : l);
	return result.join('');
}

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

function decodeUTF8(data) {
	const codes = [];
	for (let i = 0; i < data.length;) {
		const c = data[i++];
		const len = (c > 0xBF) + (c > 0xDF) + (c > 0xEF);
		let val = c & (0xFF >> (len + 1));
		for (const end = i + len; i < end; i++) {
			val = (val << 6) + (data[i] & 0x3F);
		}
		codes.push(val);
	}
	return String.fromCharCode(...codes);
}

function encodeUTF8(string) {
	const data = [];
	for (const c of string) {
		const code = c.charCodeAt(0);
		const len = (code > 0x7F) + (code > 0x7FF) + (code > 0xFFFF);
		let bits = len * 6;

		data.push((len ? ~(0xFF >> len + 1) : (0)) + (code >> bits));
		while (bits > 0) {
			data.push(0x80 + ((code >> (bits -= 6)) & 0x3F))
		}
	}
	return new Uint8Array(data);
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