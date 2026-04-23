import axios from 'axios';
import { load as loadCheerio } from 'cheerio';

const SPELLER_PROVIDER_URL =
  'https://m.search.naver.com/search.naver?query=%EB%A7%9E%EC%B6%A4%EB%B2%95%EA%B2%80%EC%82%AC%EA%B8%B0';

const SPELLER_API_URL_SUBSTR = '/ocontent/util/SpellerProxy?passportKey=';

const SPELLER_API_URL_REGEX =
  /https:\/\/[^\/"']+\/ocontent\/util\/SpellerProxy\?passportKey=([a-zA-Z0-9]+)/;

export interface SpellerApiResponse {
  message: {
    result: {
      html: string;
      errata_count: number;
      origin_html: string;
      notag_html: string;
    };
    error: string;
  };
}

export async function getSpellerApiUrl() {
  const response = await axios.get(SPELLER_PROVIDER_URL);
  const cheerio = loadCheerio(response.data);

  let spellerApiUrl: string | undefined = undefined;

  cheerio('script').each((_, element) => {
    const scriptContent = cheerio(element).html() || '';
    if (scriptContent.includes(SPELLER_API_URL_SUBSTR)) {
      const match = scriptContent.match(SPELLER_API_URL_REGEX);
      spellerApiUrl = match ? match[0] : undefined;
      return false;
    }
  });

  if (spellerApiUrl !== undefined) {
    return spellerApiUrl + '&color_blindness=0&q=';
  }

  return undefined;
}
