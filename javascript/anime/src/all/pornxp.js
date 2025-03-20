const mangayomiSources = [
	{
		"name": "PornXP",
		"lang": "all",
		"baseUrl": "https://pornxp.cc",
		"apiUrl": "",
		"iconUrl": "https://pornxp.cc/favicon.png",
		"typeSource": "single",
		"itemType": 1,
		"version": "0.0.1",
		"pkgPath": "anime/src/all/pornxp.js"
	}
];

class DefaultExtension extends MProvider {
	async request(url) {
		const host = this.source.baseUrl;

		try {
			const assembleURL = absUrl(url, host);

			return await new Client({ 'useDartHttpClient': true }).get(assembleURL);
		} catch (error) {
			console.log('Error en request: ' + error.message)
		}
	}

	async getSearchItems(url) {
		try {
			const res = await this.request(url);
			const doc = new Document(res.body);

			const nextPage = doc.selectFirst('#pages > span:contains(">")').outerHtml !== ''
			const elements = doc.select('div.item_cont');

			const items = [];
			for (const element of elements) {
				const coverHtml = element.selectFirst('.item_img').outerHtml;
				const cover = coverHtml.match(/<img[^>]*src="([^"]+)"[^>]*>/)?.[1] || '';
				const href = element.selectFirst('a').attr('href');
				const title = element.selectFirst('.item_title').text.trim();

				items.push({
					name: title,
					link: href.split('/').pop(),
					imageUrl: `https:${cover}`
				});
			}

			return {
				list: items,
				hasNextPage: nextPage
			}
		} catch (error) {
			console.error(`Error en getSearchItems: ${error.message || error}`)
		}
	}

	async getPopular(page) {
		return this.getSearchItems(`/best/?page=${page}`);
	}

	async getLatestUpdates(page) {
		return this.getSearchItems(`/released/?page=${page}`);
	}

	async search(query, page, filters) {
		let searchUrl = `/?page=${page}`

		try {
			if (query) {
				searchUrl = `/tags/${encodeURI(query)}?page=${page}`
			} else if (filters) {
				var tag, params = [];
				for (const filter of filters) {
					if (filter["state"] !== "") {
						if (filter["type"] == "with_tags") {
							tag = filter.values[filter.state].value;
						} else if (filter["type"] == "with_sort") {
							params.push(`sort=${filter.values[filter.state].value}`)
						}
					}
				}
				params.push(`page=${page}`)
				searchUrl = tag === 'hd'
					? `/hd/?${params.join('&')}`
					: `/tags/${tag}?${params.join('&')}`
			}

			return await this.getSearchItems(searchUrl)
		} catch (error) {
			console.log(`Error en search: ${error.message || error}`)
		}
	}

	async getDetail(code) {
		try {
			const res = await this.request(`/videos/${code}`)
			const doc = new Document(res.body);

			const title = doc.selectFirst('.player_details > h1').text;
			const cover = doc.selectFirst('video#player').attr('poster');
			const genres = doc.select('.tags > a').map(tag => tag.text.trim());
			const overview = doc.selectFirst('#desc').text.trim()
			const matchTim = overview.match(/(\d{4}.\d{2}.\d{2})/g) || ''
			const timeDate = matchTim[1] ?? matchTim[0]

			return {
				name: title,
				link: `https://pornxp.cc/videos/${code}`,
				imageUrl: `https:${cover}`,
				author: 'Unknown',
				artist: 'Unknown',
				status: 1,
				genre: genres,
				description: overview,
				episodes: [
					{
						name: 'Watch Online',
						url: code,
						dateUpload: String(new Date(timeDate).valueOf())
					}
				]
			};
		} catch (error) {
			console.error('Error en getDetail: ' + error.message)
		}
	}

	// For anime episode video list
	async getVideoList(code) {
		const preferences = new SharedPreferences();
		const resolution = preferences.get("pref_resolution") || '1080';
		const headers = {
			'Referer': this.source.baseUrl,
			'user-agent': 'Mangayomi'
		}

		try {
			const res = await this.request(`/videos/${code}`)
			const doc = new Document(res.body);

			const sources = doc.select('video#player > source').map(video => {
				return {
					url: `https:${video.attr('src')}`,
					originalUrl: `https:${video.attr('src')}`,
					quality: video.attr('title'),
					headers: headers
				}
			});

			return sources.sort(
				(a, b) => {
					const scoreA = a.quality.includes(resolution) ? 1 : 0;
					const scoreB = b.quality.includes(resolution) ? 1 : 0;

					return scoreB - scoreA
				}
			)
		} catch (error) {
			throw new Error(`Error en getVideoList: ${error.message || error}`)
		}
	}

	getFilterList() {
		return [
			{
				type_name: "HeaderFilter",
				name: "The filter is ignored when using text search.",
			},
			{
				type: "with_sort",
				name: "Sort by",
				type_name: "SelectFilter",
				values: [
					{ name: "Top Rated", value: "", type_name: "SelectOption" },
					{ name: "Newest", value: "new", type_name: "SelectOption" },
					{ name: "Recent Releases", value: "released", type_name: "SelectOption" }
				]
			},
			{
				type: "with_tags",
				name: "Tags",
				type_name: "SelectFilter",
				values: [
					{ name: '< Select Tags >', value: "", type_name: "SelectOption" },
					{ name: "Quality HD", value: "hd", type_name: "SelectOption" },
					{ name: "EroticAnal", value: "21EroticAnal", type_name: "SelectOption" },
					{ name: "BangBros", value: "BangBros18", type_name: "SelectOption" },
					{ name: "Brazzers", value: "Brazzers", type_name: "SelectOption" },
					{ name: "BrazzersExxtra", value: "BrazzersExxtra", type_name: "SelectOption" },
					{ name: "DadCrush", value: "DadCrush", type_name: "SelectOption" },
					{ name: "TeamSkeet+", value: "TeamSkeet", type_name: "SelectOption" },
					{ name: "SexMex", value: "SexMex.xxx", type_name: "SelectOption" },
					{ name: "BareBackStudios+", value: "BareBackStudios", type_name: "SelectOption" },
					{ name: 'CumLouder', value: "CumLouder", type_name: "SelectOption" },
					{ name: 'BadDaddyPOV', value: "BadDaddyPOV", type_name: "SelectOption" },
					{ name: 'Lily Phillips', value: "Lily-Phillips", type_name: "SelectOption" },
					{ name: 'LaSirena69', value: "LaSirena69", type_name: "SelectOption" }
				]
			}
		]
	}

	getSourcePreferences() {
		return [
			{
				key: 'pref_resolution',
				listPreference: {
					title: 'Preferred Resolution',
					summary: 'If available, this resolution will be chosen by default.',
					valueIndex: 0,
					entries: ['1080p', '720p', '360p'],
					entryValues: ['1080', '720', '360']
				}
			}
		];
	}
}

//--------------------------------------------------------------------------------------------------
//  Extension Helpers
//--------------------------------------------------------------------------------------------------

function absUrl(url, base) {
	const isAbsURL = url.includes('https://');

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