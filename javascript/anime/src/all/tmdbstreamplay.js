const mangayomiSources = [{
	"name": "TMDbStreamPlay",
	"lang": "all",
	"baseUrl": "https://www.themoviedb.org",
	"apiUrl": "https://api.themoviedb.org/3",
	"iconUrl": "https://play-lh.googleusercontent.com/8oYvHLFp2-swlnr1RCOlaXH_H_In9PHdQz9KszyOHPq7o-Hya_qlqcZO6vG8Bm4xzjk",
	"typeSource": "single",
	"itemType": 1,
	"version": "0.0.1",
	"pkgPath": "anime/src/all/tmdbstreamplay.js"
}];

class DefaultExtension extends MProvider {
	async tmdbRequest(pathname) {
		const TMDb_API = 'https://api.themoviedb.org/3';
		const TMDb_KEY = this.getPreference('tmdb_api');
		const TMDb_ISO = this.getPreference('tmdb_iso');

		try {
			if (!TMDb_KEY)
				throw new Error('TMDb Key is not set');

			const param = [
				`api_key=${TMDb_KEY}`,
				`language=${TMDb_ISO}`
			]

			const checkParams = pathname.includes('?') ? '&' : '?'
			const assembleURL = `${TMDb_API + pathname}${checkParams}${param.join('&')}`
			const response = await new Client().get(assembleURL, {
				'accept': 'application/json'
			});

			if (response.statusCode !== 200)
				throw new Error(`statusCode ${response.statusCode} - failed to fetch data`);

			return response.body
		} catch (error) {
			throw new Error(`Error en request: ${error.message || error}`)
		}
	}

	async getSearchItems(pathname, type) {
		try {
			const body = await this.tmdbRequest(pathname)
			const JSON_body = JSON.parse(body);

			const items = JSON_body.results.map(media => {
				const thisMediaType = media.media_type || type;
				return {
					name: media.title || media.name,
					imageUrl: this.getImageUrl(media.poster_path),
					link: `/${thisMediaType}/${media.id}`,
				};
			}).filter(key => key.imageUrl);

			return {
				list: items,
				hasNextPage: JSON_body.page !== JSON_body.total_pages
			};
		} catch (error) {
			console.error(`Error en getSearchItems: ${error.message || error}`)
		}
	}

	async getPopular(page) {
		return await this.getSearchItems(`/trending/all/week?page=${page}`);
	}

	async getLatestUpdates(page) {
		return await this.getSearchItems(`/trending/all/day?page=${page}`);
	}
	async search(query, page, filters) {

		if (query) {
			return await this.getSearchItems(`/search/multi?include_adult=false&query=${query}&page=${page}`);
		} else if (filters) {
			const { href, type } = this.assembleFilter(filters, page)
			return await this.getSearchItems(href, type);
		}
	}
	async getDetail(pathname) {
		const [type, id] = pathname.slice(1).split('/');

		try {
			const body = await this.tmdbRequest(`${pathname}?append_to_response=external_ids`)
			const JSON_body = JSON.parse(body);

			const mediaInfo = {}
			mediaInfo.name = JSON_body.title || JSON_body.name;
			mediaInfo.link = 'https://www.themoviedb.org' + pathname;
			mediaInfo.imageUrl = this.getImageUrl(JSON_body.poster_path, true);
			mediaInfo.author = JSON_body.production_companies[0].name || undefined;
			mediaInfo.status = this.parseStatus(JSON_body.status);
			mediaInfo.genre = JSON_body.genres.map(genre => genre.name);
			mediaInfo.description = JSON_body.overview;
			mediaInfo.episodes = [];

			const IMDb_ID = JSON_body.imdb_id || JSON_body.external_ids.imdb_id;
			if (type === 'movie') {
				mediaInfo.episodes.push({
					name: 'Watch',
					url: `${id}|${IMDb_ID}`,
					dateUpload: String(new Date(JSON_body.release_date).valueOf())
				})
			} else {
				for (const season of JSON_body.seasons) {
					const seasonPath = `/${type}/${id}/season/${season.season_number}`;

					if (season.season_number === 0) continue;
					const seasonData = await this.tmdbRequest(seasonPath);
					const seasonJSON = JSON.parse(seasonData);

					seasonJSON.episodes.forEach(key => {
						const onEpisode = key.runtime !== null
						const nameEpisode = onEpisode ? key.name : `Released on ${key.air_date}`
						const hrefEpisode = onEpisode ? `${id}|${IMDb_ID}|${key.season_number}|${key.episode_number}` : ''
						mediaInfo.episodes.push({
							name: `T${key.season_number}:E${key.episode_number} - ${nameEpisode}`,
							url: hrefEpisode,
							dateUpload: String(new Date(key.air_date).valueOf())
						});
					});
				}
			}

			return mediaInfo;
		} catch (error) {
			console.log(`Error en getSearchInfo: ${error.message || error}`)
		}
	}

	parseStatus(status) {
		//  0 => "ongoing", 1 => "complete", 2 => "hiatus", 3 => "canceled", 4 => "publishingFinished", 5 => unknow
		const statusMap = {
			'Released': 0,
			'Ended': 1,
			'Returning Series': 2,
			'Canceled': 3,
			'Pilot': 0,
			'Planned': 0,
			'In Production': 0
		}
		return statusMap[status] ?? 5;
	}

	getImageUrl(path, HD) {
		const quality = HD ? 'original' : 'w500';

		if (path) {
			return `https://image.tmdb.org/t/p/${quality}${path}`
		} else {
			return null
		}
	}

	// For anime episode video list
	async getVideoList(TMDb) {
		const [TMDb_ID, IMDb_ID, SEASON, EPISODE] = TMDb.split('|');
		const prefAPI = this.getPreference('pref_API')
		const hasIMDb = IMDb_ID.startsWith('tt');
		let servers = []

		try {
			if (prefAPI === '1' || prefAPI === '0') {
				const riverstream = await API_riverstream(TMDb_ID, SEASON, EPISODE)
				servers.push(...riverstream)
			}
	
			if (prefAPI === '2' || prefAPI === '0') {
				const vidsrcsu = await API_vidsrcSu(TMDb_ID, SEASON, EPISODE)
				servers.push(...vidsrcsu.dataServ)
			}

			if (hasIMDb) {
				if (prefAPI === '3' || prefAPI === '0') {
					const embed69 = await API_embed69(IMDb_ID, SEASON, EPISODE)
					servers.push(...embed69)
				}

				if (prefAPI === '4' || prefAPI === '0') {
					const streamsito = await API_streamsito(IMDb_ID, SEASON, EPISODE)
					servers.push(...streamsito)
				}
			}

			// Buscamos los Subtitulos
			const subtitles = await getSubtitleList(TMDb_ID, SEASON, EPISODE);

			// Mapeo de promesas con parámetros corregidos
			const promises = servers.map(({ url, method, lang, type, host }) =>
				extractAny(url, method, lang, type, host)
			);

			// Manejo de promesas
			const results = await Promise.allSettled(promises);

			// Filtrar y aplanar los resultados cumplidos
			const videos = results.filter(p => p.status === 'fulfilled').flatMap(p => p.value);

			// Agregamos los Subtitulos
			videos.map(key => {
				if (!key.quality.includes('VOSE')) {
					return key.subtitles = subtitles
				}
			})

			return sortVideos(videos)
		} catch (error) {
			console.error(`Error en getVideoList: ${error.message || error}`)
		}
	}

	assembleFilter(filters, page) {
		let type = "", params = [];
		filters.forEach(item => {
			const paramGenerators = {
				'with_networks': () => `with_networks=${item.values[item.state].value}`,
				'with_genres': () => `with_genres=${item.values[item.state].value}`,
				'sort_by': () => `sort_by=${item.values[item.state].value}`
			};

			const generateParam = paramGenerators[item.type];
			if (item.type === 'media_type') {
				type = item.values[item.state].value
			} else if (generateParam && item.state !== 0) {
				params.push(generateParam());
			}
		});
		params.push(`page=${page}`);

		return {
			href: `/discover/${type}?${params.join('&')}`,
			type: type
		};
	}
	getFilterList() {
		return [
			{
				type_name: "HeaderFilter",
				name: "The filter is ignored when using text search.",
			},
			{
				type: "media_type",
				name: "Type",
				type_name: "SelectFilter",
				values: [
					{ name: "Movie", value: "movie", type_name: "SelectOption" },
					{ name: "TvShows", value: "tv", type_name: "SelectOption" }
				]
			},
			{
				type_name: "HeaderFilter",
				name: "The network filter only works with TV Shows",
			},
			{
				type: "with_networks",
				name: "Networks",
				type_name: "SelectFilter",
				values: [
					{ name: "< Select Network >", value: "0", type_name: "SelectOption" },
					{ name: "HBO", value: "49", type_name: "SelectOption" },
					{ name: "Netflix", value: "213", type_name: "SelectOption" },
					{ name: "Hulu", value: "453", type_name: "SelectOption" },
					{ name: "Amazon", value: "1024", type_name: "SelectOption" },
					{ name: "Apple TV+", value: "2552", type_name: "SelectOption" },
					{ name: "Disney+", value: "2739", type_name: "SelectOption" },
					{ name: "Peacock", value: "3353", type_name: "SelectOption" },
					{ name: "Paramount+", value: "4330", type_name: "SelectOption" }
				]
			},
			{
				type: "with_genres",
				name: "Genres",
				type_name: "SelectFilter",
				values: [
					{ name: "< Select Genre >", value: "0", type_name: "SelectOption" },
					{ name: "Aventura", value: "12", type_name: "SelectOption" },
					{ name: "Fantasía", value: "14", type_name: "SelectOption" },
					{ name: "Animación", value: "16", type_name: "SelectOption" },
					{ name: "Drama", value: "18", type_name: "SelectOption" },
					{ name: "Terror", value: "27", type_name: "SelectOption" },
					{ name: "Acción", value: "28", type_name: "SelectOption" },
					{ name: "Comedia", value: "35", type_name: "SelectOption" },
					{ name: "Historia", value: "36", type_name: "SelectOption" },
					{ name: "Western", value: "37", type_name: "SelectOption" },
					{ name: "Suspense", value: "53", type_name: "SelectOption" },
					{ name: "Crimen", value: "80", type_name: "SelectOption" },
					{ name: "Documental", value: "99", type_name: "SelectOption" },
					{ name: "Ciencia ficción", value: "878", type_name: "SelectOption" },
					{ name: "Misterio", value: "9648", type_name: "SelectOption" },
					{ name: "Música", value: "10402", type_name: "SelectOption" },
					{ name: "Romance", value: "10749", type_name: "SelectOption" },
					{ name: "Familia", value: "10751", type_name: "SelectOption" },
					{ name: "Bélica", value: "10752", type_name: "SelectOption" },
					{ name: "Action & Adventure", value: "10759", type_name: "SelectOption" },
					{ name: "Kids", value: "10762", type_name: "SelectOption" },
					{ name: "News", value: "10763", type_name: "SelectOption" },
					{ name: "Reality", value: "10764", type_name: "SelectOption" },
					{ name: "Sci-Fi & Fantasy", value: "10765", type_name: "SelectOption" },
					{ name: "Soap", value: "10766", type_name: "SelectOption" },
					{ name: "Talk", value: "10767", type_name: "SelectOption" },
					{ name: "War & Politics", value: "10768", type_name: "SelectOption" },
					{ name: "Película de TV", value: "10770", type_name: "SelectOption" }
				]
			},
			{
				type: "sort_by",
				name: "Sort by",
				type_name: "SelectFilter",
				values: [
					{ name: "< Default >", value: "0", type_name: "SelectOption" },
					{ name: "Title", value: "title.desc", type_name: "SelectOption" },
					{ name: "Popularity", value: "popularity.desc", type_name: "SelectOption" },
					{ name: "Release Date", value: "primary_release_date.desc", type_name: "SelectOption" },
					{ name: "Rating", value: "vote_average.desc", type_name: "SelectOption" }
				]
			}
		]
	}

	getPreference(key) {
		const preference = new SharedPreferences();
		try {
			return preference.get(key);
		} catch (error) {
			console.error(`Error en getPreferences: ${error.message ?? error}`);
			return null
		}
	}

	getSourcePreferences() {
		const languages = ['Latino', 'Español', 'English'];
		const resolutions = ['1080p', '720p', '480p'];
		const hosts = [
			"StreamWish",
			"StreamTape",
			"DoodStream",
			"StreamLare",
			"LuluStream",
			"FileMoon",
			"Voe"
		];

		return [
			{
				key: "tmdb_api",
				editTextPreference: {
					title: "TMDb API key",
					summary: "Enter a TMDb API key",
					value: "",
					dialogTitle: "API",
					dialogMessage: ""
				}
			},
			{
				key: 'tmdb_iso',
				listPreference: {
					title: 'Display Language',
					summary: 'Choose the language in which the information will be displayed.',
					valueIndex: 0,
					entries: ["Spanish", "English", "Japonés", "Hindi", "Ruso"],
					entryValues: ["es-419", "en-US", "ja", "hi", "ru"]
				}
			},
			{
				key: 'subtitle_host',
				listPreference: {
					title: 'Preferred subtitle source',
					summary: '',
					valueIndex: 0,
					entries: ["Wyzie.ru", "Hexa.watch"],
					entryValues: ["1", "2"]
				}
			},
			{
				key: 'pref_API',
				listPreference: {
					title: 'Preferred API source',
					summary: '',
					valueIndex: 0,
					entries: [
						'All',
						'RiverStream (English)',
						'VidSrc (English)',
						'Embed69 (Latino, Español, English)',
						'Streamsito (Latino, Español, English)'
					],
					entryValues: ['0', '1', '2', '3', '4']
				}

			},
			{
				key: 'pref_language',
				listPreference: {
					title: 'Preferred Audio Language',
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
			},
		];
	}
}

/***************************************************************************************************
* 
*   mangayomi-js-helpers v1.2
*       
*   # Video Extractors
*       - doodExtractor
*       - vidozaExtractor
*       - filemoonExtractor
*       - mixdropExtractor
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
*       - sortVideos()
*		- getSubtitleList()
*		- API_riverstream()
*		- API_vidsrcSu()
*		- API_embed69()
*		- API_embedsito()
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

async function vidozaExtractor(url) {
	let response = await new Client({ 'useDartHttpClient': true, "followRedirects": true }).get(url);
	const videoUrl = response.body.match(/https:\/\/\S*\.mp4/)[0];
	return [{ url: videoUrl, originalUrl: videoUrl, quality: '' }];
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
		v.quality = v.quality ? `${lang} ${type} ${host} ${v.quality}` : `${lang} ${type} ${host}`;
		return v;
	});
};

extractAny.methods = {
	'doodstream': doodExtractor,
	'filemoon': filemoonExtractor,
	'luluvdo': luluvdoExtractor,
	'mixdrop': mixdropExtractor,
	'streamtape': streamTapeExtractor,
	'streamwish': vidHideExtractor,
	'vidoza': vidozaExtractor,
	'm3u8': m3u8Extractor,
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
	const disp = preferences.get("pref_resolution");
	const host = preferences.get("pref_host");

	const getScore = (quality) => {
		const langScore = lang === null || quality.toLowerCase().includes(lang.toLowerCase()) ? 1 : 0;
		const dispScore = disp === null || quality.toLowerCase().includes(disp.toLowerCase()) ? 1 : 0;
		const hostScore = host === null || quality.toLowerCase().includes(host.toLowerCase()) ? 1 : 0;

		// Se asignan pesos: mayor prioridad al idioma, seguido de resolución y host.
		return (langScore * 8) + (dispScore * 4) + (hostScore * 2);
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

// Gets subtitles based on TMDB id.
async function getSubtitleList(TMDbID, season, episode) {
	const pref = new SharedPreferences();
	const subtitleHost = pref.get("subtitle_host");
	const prefLanguage = pref.get("tmdb_iso").split('-')[0];

	try {
		const headers = {};
		let apiUrl = '';

		switch (subtitleHost) {
			case "2":
				apiUrl = `https://sources.hexa.watch/subs/${TMDbID}`;
				headers.Origin = "https://api.hexa.watch";
				if (season) apiUrl += `/${season}/${episode}`;
				break;
			case "1":
			default:
				apiUrl = `https://sub.wyzie.ru/search?id=${TMDbID}`;
				if (season) apiUrl += `&season=${season}&episode=${episode}`;
				break;
		}

		const response = await new Client().get(apiUrl, headers);
		if (response.statusCode != 200) {
			throw new Error(`Error interno del servidor Code: ${response.statusCode}`)
		}

		const subtitles = JSON.parse(response.body);

		// Ordenar subtítulos: priorizar el idioma seleccionado
		subtitles.sort((a, b) => {
			const aMatch = a.language?.toLowerCase().includes(prefLanguage.toLowerCase());
			const bMatch = b.language?.toLowerCase().includes(prefLanguage.toLowerCase());

			if (aMatch && !bMatch) return -1;
			if (!aMatch && bMatch) return 1;

			return 0;
		});

		return subtitles.map(sub => ({
			file: sub.url,
			label: sub.display
		}));

	} catch (error) {
		console.error(`Error fetching subtitles: ${error.message || error}`);
		return [];
	}
}

async function API_riverstream(TMDb_ID, SEASON, EPISODE) {
	const API_href = 'https://scrapper.rivestream.org/api/embed?provider=vidsrcrip'
	const assembleURL = SEASON
		? `${API_href}&id=${TMDb_ID}&season=${SEASON}&episode=${EPISODE}`
		: `${API_href}&id=${TMDb_ID}`;
	const seenLinks = new Set();

	try {
		const response = await new Client().get(assembleURL);
		if (response.statusCode != 200) {
			throw new Error("RiverStream unavailable. Please choose a different server");
		}

		const hostRenameLUT = {
			65: 'StreamWish', 64: 'FileLions', 48: 'Voe', 43: 'StreamTape',
			42: 'DoodStream', 29: 'MixDrop', 7: 'VidOza'
		}

		const dataJSON = JSON.parse(response.body);
		const dataServ = dataJSON.data.sources.map(key => {
			const method = hostRenameLUT[key.host_id] ?? 'Unknown'
			return {
				url: key.link,
				method: method.toLowerCase(),
				lang: `English`,
				type: `SUB`,
				host: `RiverStream: ${method}`
			}
		}).filter(item => {
			const checkPass = seenLinks.has(item.url)
			if (item.method === 'unknown' || checkPass) {
				return false
			} else {
				seenLinks.add(item.url);
			};
			return true
		});

		return dataServ
	} catch (error) {
		console.error(`${error.message || error}`);
		return [];
	}
}

async function API_vidsrcSu(TMDb_ID, SEASON, EPISODE) {
	const API_href = 'https://vidsrc.su/embed'
	const assembleURL = SEASON
		? `${API_href}/tv/${TMDb_ID}/${SEASON}/${EPISODE}`
		: `${API_href}/movie/${TMDb_ID}`;
	const seenLinks = new Set();

	try {
		const response = await new Client().get(assembleURL);
		if (response.statusCode != 200)
			throw new Error("VidSrc.su unavailable. Please choose a different server");

		// Extraer fuentes del código fuente
		const htmlContent = response.body;
		const dataServ = [];
		const subtitle = [];

		// Utilizar expresiones regulares para extraer los datos de las fuentes
		const sourcesRegex = /{ label: '(.*?)', url: '(.*?)' },/g;
		for (const match of htmlContent.matchAll(sourcesRegex)) {
			const [_, label, url] = match;
			const hasUrl = seenLinks.has(url)
			if (!hasUrl && url !== "") {
				console.log(url)
				dataServ.push({
					url: decodeURIComponent(url),	// URL que contenga el .m3u8
					method: 'm3u8',					// Metodo de extraccion
					lang: 'English',				// Idioma por defecto
					type: 'SUB',					// Tipo por defecto
					host: `VidSrc:`					// host de extraccion
				});
			} else {
				seenLinks.add(url)
			}
		}

		// Extraer subtítulos del código fuente
		const subtitlesRegex = /{"id":.*?"url":"(.*?)".*?"display":"(.*?)"/g;
		for (const match of htmlContent.match(subtitlesRegex)) {
			const [_, url, display] = match;
			subtitle.push({
				file: url,			// Archivo srt
				label: display		// Nombre completo del idioma
			});
		}

		return {
			dataServ,
			subtitle
		}
	} catch (error) {
		console.error(`${error.message || error}`);
		return [];
	}
}

async function API_embed69(IMDb_ID, SEASON, EPISODE) {
	const API_href = 'https://embed69.org/f'
	const assembleURL = SEASON
		? `${API_href}/${IMDb_ID}-${SEASON}x${Number(EPISODE) < 10 ? '0' + EPISODE : EPISODE}`
		: `${API_href}/${IMDb_ID}`;
	const DECRYPT_KEY = 'Ak7qrvvH4WKYxV2OgaeHAEg2a5eh16vE';

	try {
		const response = await new Client().get(assembleURL);
		if (response.statusCode != 200)
			throw new Error("Embed69 unavailable. Please choose a different server");

		const document = new Document(response.body);
		const script = document.selectFirst("script:contains('function decryptLink')")

		if (!script)
			throw new Error("Embed69 Source unavailable. Please choose a different server");

		// Extraer la parte del texto que contiene el array
		const scriptText = script.text;
		const dataLinkString = scriptText.match(/const dataLink = (\[.*?\];)/s)[1];

		// Eliminar el punto y coma final y convertir a objeto
		const dataLink = JSON.parse(dataLinkString.slice(0, -1));

		let dataServ = [];
		let languageFix = { 'LAT': 'Latino', 'ESP': 'Español', 'SUB': 'English' };
		let hostRenameLUT = { 'streamwish': 'StreamWish', 'filemoon': 'FileMoon', 'voe': 'Voe', 'lulustream': 'luluvdo', 'vidhide': 'VidHide' }
		dataLink.map((link) => {
			const language = link['video_language'];
			const sortVideos = link['sortedEmbeds'];
			sortVideos.map(video => {
				if (video['servername'] === 'download') return;

				const host = hostRenameLUT[video['servername']] || video['servername']
				dataServ.push({
					url: decryptAESCryptoJS(video['link'], DECRYPT_KEY),
					method: host.toLowerCase(),
					lang: languageFix[language] || 'Unknown',
					type: languageFix[language] === 'English' ? 'VOSE' : 'DUB',
					host: `Embed69: ${host}`
				});
			});
		});

		return dataServ
	} catch (error) {
		console.error(`${error.message || error}`);
		return [];
	}
}

async function API_streamsito(IMDb_ID, SEASON, EPISODE) {
	const API_href = 'https://streamsito.com/video'
	const assembleURL = SEASON
		? `${API_href}/${IMDb_ID}-${SEASON}x${Number(EPISODE) < 10 ? '0' + EPISODE : EPISODE}`
		: `${API_href}/${IMDb_ID}`;

	try {
		const response = await new Client().get(assembleURL);
		const documnet = new Document(response.body)

		const errorPage = documnet.selectFirst('#ErrorWin div[role="texterror"]')?.text;
		if (response.statusCode != 200 || errorPage) {
			throw new Error("StreamSito unavailable. " + errorPage);
		}

		const options = {
			'Latino': documnet.select('.OD_1 > li[data-lang="0"]'),
			'Español': documnet.select('.OD_1 > li[data-lang="1"]'),
			'Subtitulado': documnet.select('.OD_1 > li[data-lang="2"]')
		};

		let dataServ = [];
		let hostRenameLUT = { 'streamwish': 'StreamWish', 'filemoon': 'FileMoon', 'voe': 'Voe', 'lulustream': 'luluvdo', 'vidhide': 'VidHide' }
		for (const [language, elements] of Object.entries(options)) {
			if (elements.length === 0) continue;

			elements.forEach((element, _index) => {
				const onclick = element.attr('onclick');
				const server = element.text.trim().split('\n')[0];
				const videoUrl = onclick.substringBetween("go_to_playerVast('", "',");
				const host = hostRenameLUT[server] || server;

				if (videoUrl.includes('embedsito.net')) return;
				if (videoUrl.includes('xupalace.org')) return;

				dataServ.push({
					url: videoUrl,
					method: host.toLowerCase(),
					lang: language === 'Subtitulado' ? 'English' : language,
					type: language === 'Subtitulado' ? 'VOSE' : 'DUB',
					host: `StreamSito: ${host}`
				});
			});
		}

		return dataServ
	} catch (error) {
		console.error(`${error.message || error}`);
		return [];
	}
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