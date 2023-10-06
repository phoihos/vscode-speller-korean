import axios from 'axios';

import { getSpellerApiUrl, SpellerApiResponse } from './spellerProviderHelper';

let SPELLER_API_URL: string | undefined = undefined;

function unescape(str: string, eol: string) {
  return str
    .replace(/<br>/g, eol)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
}

async function correctTextChunk(
  textChunk: string,
  eol: string,
  onError?: (message: string) => void
) {
  try {
    const response = await axios.get<SpellerApiResponse>(
      SPELLER_API_URL! + encodeURIComponent(textChunk),
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36 Edg/117.0.2045.36'
        }
      }
    );

    if (response.status !== 200) {
      throw new Error(`Http error: ${response.status}`);
    } else if (response.data === null) {
      throw new Error('Http error: Response data is null');
    } else if (response.data.message.error !== undefined) {
      if (response.data.message.error === '유효한 키가 아닙니다.') {
        SPELLER_API_URL = undefined;
        throw new Error('Http error: Temporary Error Occurred. Please Try Again');
      } else {
        throw new Error(`Speller API error: ${response.data.message.error}`);
      }
    }

    return unescape(response.data.message.result.notag_html, eol);
  } catch (e) {
    console.error((<Error>e).message);
    onError?.((<Error>e).message);

    return textChunk;
  }
}

export const MAX_CHUNK_SIZE = 500;

export async function correctText(
  text: string,
  eol: string,
  onStep?: () => void,
  onError?: (message: string) => void
) {
  // Check Speller API URL
  if (SPELLER_API_URL === undefined) {
    SPELLER_API_URL = await getSpellerApiUrl();
    if (SPELLER_API_URL === undefined) {
      throw new Error('The speller provider is not available');
    }
  }

  let correctedText = '';

  const chunkCount = Math.floor((text.length - 1) / MAX_CHUNK_SIZE) + 1;
  for (let i = 0; i < chunkCount; ++i) {
    const from = i * MAX_CHUNK_SIZE;
    const length = Math.min(text.length - from, MAX_CHUNK_SIZE);

    onStep?.();
    correctedText += await correctTextChunk(text.substr(i * MAX_CHUNK_SIZE, length), eol, onError);
  }

  return correctedText;
}
