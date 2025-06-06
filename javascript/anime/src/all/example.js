const mangayomiSources = [
	{
		"name": "Example",
		"lang": "all",
		"baseUrl": "https://example.com",
		"apiUrl": "",
		"iconUrl": "https://cdn-icons-png.flaticon.com/512/10278/10278187.png",
		"typeSource": "single",
		"itemType": 1,
		"version": "1.0.0",
		"dateFormat": "",
		"dateFormatLocale": "",
		"pkgPath": "anime/src/all/example.js"
	}
];

class DefaultExtension extends MProvider {
	getHeaders(url) {
		throw new Error("getHeaders not implemented");
	}
	async getPopular(page) {
		throw new Error("getPopular not implemented");
	}
	async getLatestUpdates(page) {
		throw new Error("getLatestUpdates not implemented");
	}
	async search(query, page, filters) {
		throw new Error("search not implemented");
	}
	async getDetail(url) {
		throw new Error("getDetail not implemented");
	}
	// For novel html content
	async getHtmlContent(url) {
		throw new Error("getHtmlContent not implemented");
	}
	// Clean html up for reader
	async cleanHtmlContent(html) {
		throw new Error("cleanHtmlContent not implemented");
	}
	// For anime episode video list
	async getVideoList(url) {
		throw new Error("getVideoList not implemented");
	}
	// For manga chapter pages
	async getPageList(url) {
		throw new Error("getPageList not implemented");
	}
	getFilterList() {
		throw new Error("getFilterList not implemented");
	}
	getSourcePreferences() {
		throw new Error("getSourcePreferences not implemented");
	}
}