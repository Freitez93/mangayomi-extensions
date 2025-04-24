const mangayomiSources = [
	{
		"name": "YesPornPlease",
		"lang": "en",
		"baseUrl": "https://yespornpleasexxx.com/",
		"apiUrl": "",
		"iconUrl": "https://yespornpleasexxx.com/wp-content/uploads/2023/12/XXX-Yespornplease-XXX-Favicon.png",
		"typeSource": "single",
		"itemType": 1,
		"version": "0.0.6",
		"pkgPath": "anime/src/en/yespornplease.js"
	}
];

class DefaultExtension extends MProvider {
	async request(URL, headers) {
		const DOMAIN = this.source.baseUrl;
		const assembleURL = absUrl(URL, DOMAIN);
		const browser = new Client();

		try {
			const requestHeaders = headers
				? { ...headers }
				: {};

			return await browser.get(assembleURL, requestHeaders);
		} catch (error) {
			console.log('Error en request: ' + error.message)
		}
	}

	async getItemFromHtml(url, callback) {
		try {
			const htmlContent = await this.request(url);
			const document = new Document(htmlContent.body)

			const hasNextPage = document.selectFirst('div.nav-links  > a.next') ? true : false;
			const articles = document.select('#tubeace-results > div').map(item => {
				const title = item.selectFirst('a').attr('title');
				const link = item.selectFirst('a').getHref;
				const imgHtml = item.selectFirst('img').outerHtml;
				const image = imgHtml.match(/https:.*?jpeg/)?.[0];

				return {
					link,
					imageUrl: image,
					name: title
				}
			});

			return {
				list: articles,
				hasNextPage
			};
		} catch (error) {
			console.log(`Error en getItemFromHtml: ${error.message}`)
		}
	}
	async getPopular(page) {
		return await this.getItemFromHtml(`/sexmex/page/${page}/`)
	}

	async getLatestUpdates(page) {
		return await this.getItemFromHtml(`/page/${page}/`)
	}
	async search(query, page, filters) {
		if (query == "") {
			var category = filters[1].values?.[filters[1].state].value
			return await this.getItemFromHtml(`${category}/page/${page}/`);
		} else {
			return await this.getItemFromHtml(`/page/${page}/?s=${query}`);
		}
	}
	async getDetail(url) {
		try {
			const detailRes = await this.request(url);
			const document = new Document(detailRes.body)

			const title = document.selectFirst('meta[property="og:title"]').attr('content');
			const cover = document.selectFirst('meta[property="og:image"]').attr('content');
			const description = document.selectFirst('meta[property="og:description"]').attr('content');
			const director = document.selectFirst('meta[name="author"]').attr('content');
			const dateTime = document.selectFirst('time[datetime]').attr('datetime')
			const genre = document.select('a[rel="tag"]').map(tag => tag.text.trim())

			return {
				name: title,
				link: url,
				imageUrl: cover,
				description,
				author: director || 'Unknown',
				//artist: artistas.toString(),
				status: 1,
				genre: genre,
				episodes: [
					{
						name: "Watch",
						url: url,
						dateUpload: String(new Date(dateTime).valueOf()),
					}
				]
			}
		} catch (error) {
			throw new Error("Error in getDetail");
			
		}
	}

	// For anime episode video list
	async getVideoList(url) {
		const headers = {
			'Referer': this.source.baseUrl,
			'user-agent': 'Mangayomi'
		};

		try {
			// Realizar la solicitud inicial
			const dataVideoRes = await this.request(url);
			const document = new Document(dataVideoRes.body);

			// Buscar el iframe en el contenido HTML
			const iframeMatch = dataVideoRes.body.match(/iframe.*src="(.*player-x.php.*?)"/);
			let dataSource;

			if (iframeMatch && iframeMatch[1]) {
				// Si se encuentra un iframe, realizar una solicitud al URL del iframe
				const iframeRes = await this.request(iframeMatch[1]);
				const iframeDoc = new Document(iframeRes.body);
				dataSource = iframeDoc.selectFirst('video > source');
			} else {
				// Si no hay iframe, buscar directamente en el documento original
				dataSource = document.selectFirst('video > source');
			}

			// Verificar si se encontró una fuente de video
			if (dataSource) {
				const source = dataSource.attr('src');
				const sourceType = dataSource.attr('type');

				// Devolver la información del video
				return [
					{
						url: source,
						originalUrl: source,
						quality: `Default ${sourceType}`,
						headers: headers
					}
				];
			} else {
				throw new Error('No se encontró ninguna fuente de video.');
			}
		} catch (error) {
			// Manejo de errores mejorado
			throw new Error(`Error en getVideoList: ${error.message}`);
		}
	}


	getFilterList() {
		return [
			{
				type_name: "HeaderFilter",
				name: "The filter is ignored when using text search.",
			},
			{
				type: "CateFilter",
				name: "Category",
				type_name: "SelectFilter",
				values: [
					{ type_name: "SelectOption", name: "Todos", value: "" },
					{ type_name: "SelectOption", name: "Big Tits", value: "/xnxx/big-tits" },
					{ type_name: "SelectOption", name: "Big Ass", value: "/xnxx/big-ass" },
					{ type_name: "SelectOption", name: "Anal", value: "/xnxx/anal" },
					{ type_name: "SelectOption", name: "Blonde", value: "/xnxx/blonde" },
					{ type_name: "SelectOption", name: "Latina", value: "/xnxx/latina" },
					{ type_name: "SelectOption", name: "Creampie", value: "/xnxx/creampie" },
					{ type_name: "SelectOption", name: "Red Head", value: "/xnxx/red-head" },
					{ type_name: "SelectOption", name: "Squirt", value: "/xnxx/squirt" },
					{ type_name: "SelectOption", name: "Threesome", value: "/xnxx/threesome" },
					{ type_name: "SelectOption", name: "Asian", value: "/xnxx/asian" },
					{ type_name: "SelectOption", name: "Brunette", value: "/xnxx/brunette" },
					{ type_name: "SelectOption", name: "Teen", value: "/xnxx/teen" },
					{ type_name: "SelectOption", name: "Double Penetration", value: "/xnxx/double-penetration" },
					{ type_name: "SelectOption", name: "Lesbian", value: "/xnxx/lesbian" },
					{ type_name: "SelectOption", name: "Small Tits", value: "/xnxx/small-tits" },
					{ type_name: "SelectOption", name: "Small Ass", value: "/xnxx/small-ass" },
					{ type_name: "SelectOption", name: "Gangbang", value: "/xnxx/gangbang" },
					{ type_name: "SelectOption", name: "Shaved Pussy", value: "/xnxx/shaved-pussy" },
					{ type_name: "SelectOption", name: "Public", value: "/xnxx/public" }
				]
			}
		]
	}
	getSourcePreferences() {
		throw new Error("getSourcePreferences not implemented");
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