const logger = require('../utils/logger');

/**
 * Service de recherche web multi-backend.
 *
 * Ordre de priorité :
 *  1. Google Custom Search API (GOOGLE_CSE_KEY + GOOGLE_CSE_ID)
 *  2. SerpAPI (SERP_API_KEY)
 *  3. DuckDuckGo Instant Answer (gratuit, sans clé, résultats limités)
 *
 * Retourne toujours un tableau de { title, snippet, url } (max 5 résultats).
 */
class WebSearchService {
  constructor() {
    this.googleKey = process.env.GOOGLE_CSE_KEY  || null;
    this.googleCse = process.env.GOOGLE_CSE_ID   || null;
    this.serpKey   = process.env.SERP_API_KEY    || null;
  }

  get isAvailable() {
    return !!(this.googleKey || this.serpKey || true); // DDG toujours dispo
  }

  async search(query, maxResults = 5) {
    if (this.googleKey && this.googleCse) {
      return this._googleCSE(query, maxResults);
    }
    if (this.serpKey) {
      return this._serpapi(query, maxResults);
    }
    return this._duckduckgo(query);
  }

  // --- Backends ---

  async _googleCSE(query, maxResults) {
    try {
      const url = new URL('https://www.googleapis.com/customsearch/v1');
      url.searchParams.set('key', this.googleKey);
      url.searchParams.set('cx',  this.googleCse);
      url.searchParams.set('q',   query);
      url.searchParams.set('num', String(Math.min(maxResults, 10)));

      const res  = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || `HTTP ${res.status}`);

      return (json.items || []).slice(0, maxResults).map(item => ({
        title:   item.title,
        snippet: item.snippet?.replace(/\n/g, ' ') || '',
        url:     item.link,
      }));
    } catch (e) {
      logger.warn(`[WebSearch] Google CSE échoué : ${e.message}`);
      return this._duckduckgo(query);
    }
  }

  async _serpapi(query, maxResults) {
    try {
      const url = new URL('https://serpapi.com/search');
      url.searchParams.set('api_key', this.serpKey);
      url.searchParams.set('q',       query);
      url.searchParams.set('hl',      'fr');
      url.searchParams.set('num',     String(Math.min(maxResults, 10)));

      const res  = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);

      return (json.organic_results || []).slice(0, maxResults).map(r => ({
        title:   r.title,
        snippet: r.snippet || '',
        url:     r.link,
      }));
    } catch (e) {
      logger.warn(`[WebSearch] SerpAPI échoué : ${e.message}`);
      return this._duckduckgo(query);
    }
  }

  async _duckduckgo(query) {
    try {
      const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
      const res  = await fetch(url, { signal: AbortSignal.timeout(6000) });
      const json = await res.json();

      const results = [];

      if (json.AbstractText) {
        results.push({
          title:   json.Heading || query,
          snippet: json.AbstractText,
          url:     json.AbstractURL || '',
        });
      }

      for (const r of (json.RelatedTopics || []).slice(0, 4)) {
        if (r.Text && r.FirstURL) {
          results.push({
            title:   r.Text.split(' - ')[0] || r.Text.slice(0, 80),
            snippet: r.Text,
            url:     r.FirstURL,
          });
        }
      }

      return results.slice(0, 5);
    } catch (e) {
      logger.warn(`[WebSearch] DuckDuckGo échoué : ${e.message}`);
      return [];
    }
  }
}

module.exports = new WebSearchService();
