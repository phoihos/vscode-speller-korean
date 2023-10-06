import axios from 'axios';
import { load as loadCheerio } from 'cheerio';

const SPELLER_PROVIDER_URL =
  'https://m.search.naver.com/search.naver?query=%EB%A7%9E%EC%B6%A4%EB%B2%95%EA%B2%80%EC%82%AC%EA%B8%B0';
const PASSPORT_KEY_REGEX = /SpellerProxy\?passportKey=([a-zA-Z0-9]+)/;

const SPELLER_API_URL =
  'https://m.search.naver.com/p/csearch/ocontent/util/SpellerProxy?passportKey=';

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

  let passportKey: string | undefined = undefined;

  cheerio('script').each((_, element) => {
    const scriptContent = cheerio(element).html() || '';
    if (scriptContent.includes(SPELLER_API_URL)) {
      const match = scriptContent.match(PASSPORT_KEY_REGEX);
      passportKey = match ? match[1] : undefined;
      return false;
    }
  });

  if (passportKey !== undefined) {
    return SPELLER_API_URL + passportKey + '&color_blindness=0&q=';
  }

  return undefined;
}
