const mangayomiSources = [
	{
		"name": "MissAV",
		"lang": "all",
		"baseUrl": "https://missav.ws",
		"apiUrl": "",
		"iconUrl": "https://missav.ws/img/favicon.png",
		"typeSource": "single",
		"itemType": 1,
		"version": "0.0.1",
		"pkgPath": "anime/src/all/missav.js"
	}
];

class DefaultExtension extends MProvider {
	async request(url) {
		const host = this.getPreferences('host');

		try {
			const assembleURL = absUrl(url, host);

			console.log(assembleURL)
			return await new Client({ 'useDartHttpClient': true }).get(assembleURL);
		} catch (error) {
			console.log('Error en request: ' + error.message)
		}
	}

	async getMovieList(url) {
		const res = await this.request(url);
		const doc = new Document(res.body);

		const nextPage = doc.selectFirst('a[rel="next"]') ? true : false
		const elements = doc.select('div.thumbnail');

		const items = [];
		for (const element of elements) {
			const cover = element.selectFirst('img').attr('data-src');
			const href = element.selectFirst('a').attr('href');
			const title = element.selectFirst('a[class*="text-secondary"]').text.trim();

			items.push({
				name: shortName(title),
				link: href,
				imageUrl: cover
			});
		}

		return {
			list: items,
			hasNextPage: nextPage
		}
	}

	async getPopular(page) {
		const lang = this.getPreferences('lang');
		return await this.getMovieList(`/${lang}/today-hot?page=${page}`);
	}

	async getLatestUpdates(page) {
		const lang = this.getPreferences('lang');
		return await this.getMovieList(`/${lang}/new?page=${page}`);
	}
	async search(query, page, filters) {
		const lang = this.getPreferences('lang');

		if (query == "") {
			var category, sort;
			for (const filter of filters) {
				if (filter.state !== 0){
					if (filter.type == "CategoryFilter") {
						category = filter.values[filter.state].value;
					} else if (filter.type == "SortFilter") {
						sort = filter.values[filter.state].value;
					}
				}
			}
			return await this.getMovieList(`/${lang}/${category}?sort=${sort}&page=${page}`);
		} else {
			return await this.getMovieList(`/${lang}/search/${query.replace(' ', '+')}?page=${page}`);
		}
	}
	async getDetail(url) {
		try {
			const res = await this.request(url);
			const doc = new Document(res.body);
			const title = doc.selectFirst('meta[property="og:title"]').attr('content');
			const cover = doc.selectFirst('meta[property="og:image"]').attr('content');
			const overview = doc.selectFirst('meta[property="og:description"]').attr('content');
			const timeDate = doc.selectFirst('time[datetime]').attr('datetime');

			let author = "";
			let artist = "";
			const genres = [];
			const infor = doc.select('.text-secondary a[href]')
			for (const info of infor) {
				const href = info.attr('href');

				if (href.includes('/makers/')) {
					author = info.text.trim();
				} else if (href.includes('/genres/')) {
					genres.push(info.text.trim());
				} else if (href.includes('/actresses/')) {
					artist = info.text.trim();
				}
			}

			return {
				name: shortName(title),
				link: url,
				imageUrl: cover,
				author: author,
				artist: artist,
				status: 1,
				genre: genres,
				description: overview,
				episodes: [
					{
						name: 'Watch Online',
						url: url,
						dateUpload: String(new Date(timeDate).valueOf())
					}
				]
			};
		} catch (error) {
			console.error('Error en getDetail: ' + error.message)
		}
	}

	// For anime episode video list
	async getVideoList(url) {
		const sourceCode = await this.request(url);

		// Buscar el bloque eval en el código fuente
		const evalRegex = /eval\(function\(p,a,c,k,e,d\)\{.*?\}\)\)/gs;
		const evalMatch = evalRegex.exec(sourceCode.body);

		if (evalMatch !== null) {
			eval?.(evalMatch[0]);
			var m3u8 = await m3u8Extractor(source, null);
		} else {
			return []
		}

		return sortVideos(m3u8);
	}

	getFilterList() {
		return [
			{
				type_name: "HeaderFilter",
				name: "El filtro se ignora cuando se utiliza la búsqueda de texto.",
			},
			{
				type: "CategoryFilter",
				name: "Genres",
				type_name: "SelectFilter",
				values: [
					{ name: "< Select Genre >", value: "0", type_name: "SelectOption" },
					{ name: "4 Hours Or More", value: "genres/4%20Hours%20Or%20More", type_name: "SelectOption" },
					{ name: "4K", value: "genres/4K", type_name: "SelectOption" },
					{ name: "69", value: "genres/69", type_name: "SelectOption" },
					{ name: "Abduction", value: "genres/Abduction", type_name: "SelectOption" },
					{ name: "Actress Collection", value: "genres/Actress%20Collection", type_name: "SelectOption" },
					{ name: "Adultery", value: "genres/Adultery", type_name: "SelectOption" },
					{ name: "Advertising Idol", value: "genres/Advertising%20Idol", type_name: "SelectOption" },
					{ name: "Aphrodisiac", value: "genres/Aphrodisiac", type_name: "SelectOption" },
					{ name: "Asian Actress", value: "genres/Asian%20Actress", type_name: "SelectOption" },
					{ name: "Anal Sex", value: "genres/Anal%20Sex", type_name: "SelectOption" },
					{ name: "Anus", value: "genres/Anus", type_name: "SelectOption" },
					{ name: "Artist", value: "genres/Artist", type_name: "SelectOption" },
					{ name: "Beautiful Breasts", value: "genres/Beautiful%20Breasts", type_name: "SelectOption" },
					{ name: "Beautiful Legs", value: "genres/Beautiful%20Legs", type_name: "SelectOption" },
					{ name: "Best, Omnibus", value: "genres/Best,%20Omnibus", type_name: "SelectOption" },
					{ name: "Big Ass", value: "genres/Big%20Ass", type_name: "SelectOption" },
					{ name: "Big Breast Fetish", value: "genres/Big%20Breast%20Fetish", type_name: "SelectOption" },
					{ name: "Big Breasts", value: "genres/Big%20Breasts", type_name: "SelectOption" },
					{ name: "Big Pennis", value: "genres/Big%20Pennis", type_name: "SelectOption" },
					{ name: "Black Hair", value: "genres/Black%20Hair", type_name: "SelectOption" },
					{ name: "Black Male Actor", value: "genres/Black%20Male%20Actor", type_name: "SelectOption" },
					{ name: "Bloomers", value: "genres/Bloomers", type_name: "SelectOption" },
					{ name: "Bukkake", value: "genres/Bukkake", type_name: "SelectOption" },
					{ name: "Bunny Girl", value: "genres/Bunny%20Girl", type_name: "SelectOption" },
					{ name: "Business Clothing", value: "genres/Business%20Clothing", type_name: "SelectOption" },
					{ name: "Car Sex", value: "genres/Car%20Sex", type_name: "SelectOption" },
					{ name: "Childhood", value: "genres/Childhood", type_name: "SelectOption" },
					{ name: "Clinic", value: "genres/Clinic", type_name: "SelectOption" },
					{ name: "Close Up", value: "genres/Close%20Up", type_name: "SelectOption" },
					{ name: "Collection", value: "genres/Collection", type_name: "SelectOption" },
					{ name: "Contribution", value: "genres/Contribution", type_name: "SelectOption" },
					{ name: "Cosplay", value: "genres/Cosplay", type_name: "SelectOption" },
					{ name: "Couple", value: "genres/Couple", type_name: "SelectOption" },
					{ name: "Creampie", value: "genres/Creampie", type_name: "SelectOption" },
					{ name: "Cruel", value: "genres/Cruel", type_name: "SelectOption" },
					{ name: "Cuckold", value: "genres/Cuckold", type_name: "SelectOption" },
					{ name: "Cunnilingus", value: "genres/Cunnilingus", type_name: "SelectOption" },
					{ name: "Delusion", value: "genres/Delusion", type_name: "SelectOption" },
					{ name: "Delivery Only", value: "genres/Delivery%20Only", type_name: "SelectOption" },
					{ name: "Delivery-Only Amateur", value: "genres/Delivery-Only%20Amateur", type_name: "SelectOption" },
					{ name: "Dildo", value: "genres/Dildo", type_name: "SelectOption" },
					{ name: "Dirty Talk", value: "genres/Dirty%20Talk", type_name: "SelectOption" },
					{ name: "Doggy Style", value: "genres/Doggy%20Style", type_name: "SelectOption" },
					{ name: "Documentary", value: "genres/Documentary", type_name: "SelectOption" },
					{ name: "Drink Urine", value: "genres/Drink%20Urine", type_name: "SelectOption" },
					{ name: "Enema", value: "genresenema", type_name: "SelectOption" },
					{ name: "Erotic Photo", value: "genres/Erotic%20Photo", type_name: "SelectOption" },
					{ name: "Esthetic Massage", value: "genres/Esthetic%20Massage", type_name: "SelectOption" },
					{ name: "Exclusive", value: "genres/Exclusive", type_name: "SelectOption" },
					{ name: "Extreme Orgasm", value: "genres/Extreme%20Orgasm", type_name: "SelectOption" },
					{ name: "Femdom Slave", value: "genres/Femdom%20Slave", type_name: "SelectOption" },
					{ name: "Female Boss", value: "genres/Female%20Boss", type_name: "SelectOption" },
					{ name: "Female College Student", value: "genres/Female%20College%20Student", type_name: "SelectOption" },
					{ name: "Female Doctor", value: "genres/Female%20Doctor", type_name: "SelectOption" },
					{ name: "Female Investigator", value: "genres/Female%20Investigator", type_name: "SelectOption" },
					{ name: "Female Teacher", value: "genres/Female%20Teacher", type_name: "SelectOption" },
					{ name: "Female Warrior", value: "genres/Female%20Warrior", type_name: "SelectOption" },
					{ name: "Feminine", value: "genres/Feminine", type_name: "SelectOption" },
					{ name: "Fetish", value: "genres/Fetish", type_name: "SelectOption" },
					{ name: "Fighter", value: "genres/Fighter", type_name: "SelectOption" },
					{ name: "Fighting", value: "genres/Fighting", type_name: "SelectOption" },
					{ name: "First Shot", value: "genres/First%20Shot", type_name: "SelectOption" },
					{ name: "Fist", value: "genres/Fist", type_name: "SelectOption" },
					{ name: "Foot Fetish", value: "genres/Foot%20Fetish", type_name: "SelectOption" },
					{ name: "Footjob", value: "genres/Footjob", type_name: "SelectOption" },
					{ name: "Foreign Actress", value: "genres/Foreign%20Actress", type_name: "SelectOption" },
					{ name: "Foreign Object Penetration", value: "genres/Foreign%20Object%20Penetration", type_name: "SelectOption" },
					{ name: "Full Hd (Fhd)", value: "genres/Full%20Hd%20%28Fhd%29", type_name: "SelectOption" },
					{ name: "Glasses Girl", value: "genres/Glasses%20Girl", type_name: "SelectOption" },
					{ name: "Group Bukkake", value: "genres/Group%20Bukkake", type_name: "SelectOption" },
					{ name: "Gym Suit", value: "genres/Gym%20Suit", type_name: "SelectOption" },
					{ name: "Harem", value: "genres/Harem", type_name: "SelectOption" },
					{ name: "Heaven Tv", value: "genres/Heaven%20Tv", type_name: "SelectOption" },
					{ name: "High Quality Vr", value: "genres/High%20Quality%20Vr", type_name: "SelectOption" },
					{ name: "High School Girl", value: "genres/High%20School%20Girl", type_name: "SelectOption" },
					{ name: "Histeroscopio", value: "genres/Histeroscopio", type_name: "SelectOption" },
					{ name: "Hit On Girls", value: "genres/Hit%20On%20Girls", type_name: "SelectOption" },
					{ name: "Hit On Boys", value: "genres/Hit%20On%20Boys", type_name: "SelectOption" },
					{ name: "Homosexual", value: "genres/Homosexual", type_name: "SelectOption" },
					{ name: "Hot Girl", value: "genres/Hot%20Girl", type_name: "SelectOption" },
					{ name: "Hot Spring", value: "genres/Hot%20Spring", type_name: "SelectOption" },
					{ name: "Hotel Owner", value: "genres/Hotel%20Owner", type_name: "SelectOption" },
					{ name: "Humiliation", value: "genres/Humiliation", type_name: "SelectOption" },
					{ name: "Hysteroscope", value: "genres/Hysteroscope", type_name: "SelectOption" },
					{ name: "Idol", value: "genres/Idol", type_name: "SelectOption" },
					{ name: "Imprisonment", value: "genres/Imprisonment", type_name: "SelectOption" },
					{ name: "Incest", value: "genres/Incest", type_name: "SelectOption" },
					{ name: "In Love", value: "genres/In%20Love", type_name: "SelectOption" },
					{ name: "Indie", value: "genres/Indie", type_name: "SelectOption" },
					{ name: "Individual", value: "genres/Individual", type_name: "SelectOption" },
					{ name: "Instant Sex", value: "genres/Instant%20Sex", type_name: "SelectOption" },
					{ name: "Kiss", value: "genres/Kiss", type_name: "SelectOption" },
					{ name: "Kimono / Yukata", value: "genres/Kimono%20/%20Yukata", type_name: "SelectOption" },
					{ name: "Kimono", value: "genres/Kimono", type_name: "SelectOption" },
					{ name: "Knee Socks", value: "genres/Knee%20Socks", type_name: "SelectOption" },
					{ name: "Lesbian", value: "genres/Lesbian", type_name: "SelectOption" },
					{ name: "Lesbian Kiss", value: "genres/Lesbian%20Kiss", type_name: "SelectOption" },
					{ name: "Lewd Nasty Lady", value: "genres/Lewd%20Nasty%20Lady", type_name: "SelectOption" },
					{ name: "Lolita", value: "genres/Lolita", type_name: "SelectOption" },
					{ name: "Long Hair", value: "genres/Long%20Hair", type_name: "SelectOption" },
					{ name: "M Male", value: "genres/M%20Male", type_name: "SelectOption" },
					{ name: "M Female", value: "genres/M%20Female", type_name: "SelectOption" },
					{ name: "Maid", value: "genres/Maid", type_name: "SelectOption" },
					{ name: "Male Squirting", value: "genres/Male%20Squirting", type_name: "SelectOption" },
					{ name: "Married Woman", value: "genres/Married%20Woman", type_name: "SelectOption" },
					{ name: "Massage", value: "genres/Massage", type_name: "SelectOption" },
					{ name: "Massage Oil", value: "genres/Massage%20Oil", type_name: "SelectOption" },
					{ name: "Masturbate", value: "genres/Masturbate", type_name: "SelectOption" },
					{ name: "Masturbation", value: "genres/Masturbation", type_name: "SelectOption" },
					{ name: "Mature Woman", value: "genres/Mature%20Woman", type_name: "SelectOption" },
					{ name: "Milk", value: "genres/Milk", type_name: "SelectOption" },
					{ name: "Mini Skirt", value: "genres/Mini%20Skirt", type_name: "SelectOption" },
					{ name: "Model", value: "genres/Model", type_name: "SelectOption" },
					{ name: "Mother", value: "genres/Mother", type_name: "SelectOption" },
					{ name: "Multiple Stories", value: "genres/Multiple%20Stories", type_name: "SelectOption" },
					{ name: "Muscle", value: "genres/Muscle", type_name: "SelectOption" },
					{ name: "Nasty", value: "genres/Nasty", type_name: "SelectOption" },
					{ name: "Ntr", value: "genres/Ntr", type_name: "SelectOption" },
					{ name: "Naked Apron", value: "genres/Naked%20Apron", type_name: "SelectOption" },
					{ name: "Nice Ass", value: "genres/Nice%20Ass", type_name: "SelectOption" },
					{ name: "Nurse", value: "genres/Nurse", type_name: "SelectOption" },
					{ name: "OL", value: "genres/OL", type_name: "SelectOption" },
					{ name: "Ordinary Person", value: "genres/Ordinary%20Person", type_name: "SelectOption" },
					{ name: "Orgy", value: "genres/Orgy", type_name: "SelectOption" },
					{ name: "Outdoor Exposure", value: "genres/Outdoor%20Exposure", type_name: "SelectOption" },
					{ name: "Outdoors", value: "genres/Outdoors", type_name: "SelectOption" },
					{ name: "Pantyhose", value: "genres/Pantyhose", type_name: "SelectOption" },
					{ name: "Petite", value: "genres/Petite", type_name: "SelectOption" },
					{ name: "Physical Education", value: "genres/Physical%20Education", type_name: "SelectOption" },
					{ name: "Planning", value: "genres/Planning", type_name: "SelectOption" },
					{ name: "Plot", value: "genres/Plot", type_name: "SelectOption" },
					{ name: "Pregnant", value: "genres/Pregnant", type_name: "SelectOption" },
					{ name: "Pregnant Woman", value: "genres/Pregnant%20Woman", type_name: "SelectOption" },
					{ name: "Premature Ejaculation", value: "genres/Premature%20Ejaculation", type_name: "SelectOption" },
					{ name: "Pretty Girl", value: "genres/Pretty%20Girl", type_name: "SelectOption" },
					{ name: "Private Teacher", value: "genres/Private%20Teacher", type_name: "SelectOption" },
					{ name: "Prostitute", value: "genres/Prostitute", type_name: "SelectOption" },
					{ name: "Pure", value: "genres/Pure", type_name: "SelectOption" },
					{ name: "Racing Girl", value: "genres/Racing%20Girl", type_name: "SelectOption" },
					{ name: "Rejuvenation Massage", value: "genres/Rejuvenation%20Massage", type_name: "SelectOption" },
					{ name: "Restraint", value: "genres/Restraint", type_name: "SelectOption" },
					{ name: "Ride", value: "genres/Ride", type_name: "SelectOption" },
					{ name: "Sailor Suit", value: "genres/Sailor%20Suit", type_name: "SelectOption" },
					{ name: "Secretary", value: "genres/Secretary", type_name: "SelectOption" },
					{ name: "Selfie", value: "genres/Selfie", type_name: "SelectOption" },
					{ name: "Sexy", value: "genres/Sexy", type_name: "SelectOption" },
					{ name: "Shame", value: "genres/Shame", type_name: "SelectOption" },
					{ name: "Shame And Humiliation", value: "genres/Shame%20And%20Humiliation", type_name: "SelectOption" },
					{ name: "Shaving", value: "genres/Shaving", type_name: "SelectOption" },
					{ name: "Short Hair", value: "genres/Short%20Hair", type_name: "SelectOption" },
					{ name: "Short Skirt", value: "genres/Short%20Skirt", type_name: "SelectOption" },
					{ name: "Sister", value: "genres/Sister", type_name: "SelectOption" },
					{ name: "Slim", value: "genres/Slim", type_name: "SelectOption" },
					{ name: "Slim Pixelated", value: "genres/Slim%20Pixelated", type_name: "SelectOption" },
					{ name: "Sneak Shots", value: "genres/Sneak%20Shots", type_name: "SelectOption" },
					{ name: "Squirting", value: "genres/Squirting", type_name: "SelectOption" },
					{ name: "Stepmother", value: "genres/Stepmother", type_name: "SelectOption" },
					{ name: "Stool", value: "genres/Stool", type_name: "SelectOption" },
					{ name: "Subjective Perspective", value: "genres/Subjective%20Perspective", type_name: "SelectOption" },
					{ name: "Super Breasts", value: "genres/Super%20Breasts", type_name: "SelectOption" },
					{ name: "Swallow Sperm", value: "genres/Swallow%20Sperm", type_name: "SelectOption" },
					{ name: "Swimsuit", value: "genres/Swimsuit", type_name: "SelectOption" },
					{ name: "Sweating", value: "genres/Sweating", type_name: "SelectOption" },
					{ name: "T-Shirt", value: "genres/T-Shirt", type_name: "SelectOption" },
					{ name: "Tall Lady", value: "genres/Tall%20Lady", type_name: "SelectOption" },
					{ name: "Tentacle", value: "genres/Tentacle", type_name: "SelectOption" },
					{ name: "Thanks Offering", value: "genres/Thanks%20Offering", type_name: "SelectOption" },
					{ name: "Threesome", value: "genres/Threesome", type_name: "SelectOption" },
					{ name: "Tickle", value: "genres/Tickle", type_name: "SelectOption" },
					{ name: "Time Stops", value: "genres/Time%20Stops", type_name: "SelectOption" },
					{ name: "Tit Job", value: "genres/Tit%20Job", type_name: "SelectOption" },
					{ name: "Toy", value: "genres/Toy", type_name: "SelectOption" },
					{ name: "Transgender", value: "genres/Transgender", type_name: "SelectOption" },
					{ name: "Transsexuals", value: "genres/Transsexuals", type_name: "SelectOption" },
					{ name: "Travel", value: "genres/Travel", type_name: "SelectOption" },
					{ name: "Uniform", value: "genres/Uniform", type_name: "SelectOption" },
					{ name: "Urinate", value: "genres/Urinate", type_name: "SelectOption" },
					{ name: "Various Occupations", value: "genres/Various%20Occupations", type_name: "SelectOption" },
					{ name: "Vibrator", value: "genres/Vibrator", type_name: "SelectOption" },
					{ name: "Vibrating Egg", value: "genres/Vibrating%20Egg", type_name: "SelectOption" },
					{ name: "Virgin", value: "genres/Virgin", type_name: "SelectOption" },
					{ name: "Waitress", value: "genres/Waitress", type_name: "SelectOption" },
					{ name: "Wardrobe", value: "genres/Wardrobe", type_name: "SelectOption" },
					{ name: "Wife", value: "genres/Wife", type_name: "SelectOption" },
					{ name: "White Skin", value: "genres/White%20Skin", type_name: "SelectOption" },
					{ name: "Whites", value: "genres/Whites", type_name: "SelectOption" },
					{ name: "With Bonus Video Only For Mgs", value: "genres/With%20Bonus%20Video%20Only%20For%20Mgs", type_name: "SelectOption" },
					{ name: "Young Wife", value: "genres/Young%20Wife", type_name: "SelectOption" },
					{ name: "Uncensored Leak", value: "uncensored-leak", type_name: "SelectOption" }
				]
			},
			{
				type: "SortFilter",
				name: "Sort by",
				type_name: "SelectFilter",
				values: [
					{ name: "< Default >", value: "0", type_name: "SelectOption" },
					{ name: "Release Date", value: "released_at", type_name: "SelectOption" },
					{ name: "Recent Update", value: "published_at", type_name: "SelectOption" },
					{ name: "Saved", value: "saved", type_name: "SelectOption" },
					{ name: "Most viewed today", value: "today_views", type_name: "SelectOption" },
					{ name: "Most viewed Weekly", value: "weekly_views", type_name: "SelectOption" },
					{ name: "Most viewed Monthly", value: "monthly_views", type_name: "SelectOption" },
					{ name: "Total Views", value: "views", type_name: "SelectOption" }
				]
			}
		];

	}

	getPreferences(key) {
		const preference = new SharedPreferences();
		const hasPref = preference.get(key)

		if (hasPref) {
			return hasPref;
		} else {
			throw new Error(`Error en getPreferences: ${error.message ?? 'Unknown error'}`);
		}
	}

	getSourcePreferences() {
		const resolutions = [
			'1080p',
			'720p',
			'480p',
			'360p'
		];

		return [
			{
				key: "lang",
				listPreference: {
					title: "Language",
					summary: "Website language",
					valueIndex: 0,
					entries: ["English", "繁體中文", "日本語", "한국의", "Melayu", "ไทย", "Deutsch", "Français", "Tiếng Việt"],
					entryValues: ["en", "zh", "ja", "ko", "ms", "th", "de", "fr", "vi"],
				}
			},
			{
				key: 'res',
				listPreference: {
					title: 'Preferred Resolution',
					summary: 'Si está disponible, se elegirá esta resolución por defecto.',
					valueIndex: 0,
					entries: resolutions,
					entryValues: resolutions
				}
			},
			{
				key: "host",
				listPreference: {
					title: "Website host",
					summary: "",
					valueIndex: 0,
					entries: ["MissAV.ws", "MissAV.ai", "MissAV123.com"],
					entryValues: ["https://missav.ws", "https://missav.ai", "https://missav123.com"],
				}
			}
		];
	}
}

//--------------------------------------------------------------------------------------------------
//  Extension Helpers
//--------------------------------------------------------------------------------------------------

function shortName(string) {
	if (string.length > 60) {
		return string.slice(0, 59) + '...';
	} else {
		return string;
	}
}

function absUrl(url, base) {
	const isAbsURL = /^\w+:\/\//.test(url);

	if (isAbsURL) {
		return url; // La URL ya es absoluta
	} else if (url.startsWith('//')) { // Solo nesesita el Protocolo
		return base.slice(0, base.indexOf(':') + 1) + url;
	} else if (url.startsWith('/')) { // Extraer el origen (protocolo + dominio + puerto) de la base
		const origin = base.match(/^(\w+:\/\/[^\/]+)/)[1];
		return origin + url;
	} else { // URL relativa: agregar al directorio de la base
		return base.slice(0, base.lastIndexOf('/') + 1) + url;
	}
}

function sortVideos(videos) {
	const prefRes = new SharedPreferences().get('res');
	const preferred = parseInt(prefRes.replace('p', ''), 10); // Se convierte a numero

	return videos.sort((a, b) => {
		const numA = parseInt(a.quality.replace('p', ''), 10); // Se convierte a numero
		const numB = parseInt(b.quality.replace('p', ''), 10); // Se convierte a numero

		// Se prioriza por la resolución preferida
		if (numA === preferred && numB !== preferred) return -1;
		if (numB === preferred && numA !== preferred) return 1;

		// Ordenar los restantes por resolución descendente
		return numB - numA;
	});
}

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