import { RestClient } from 'typed-rest-client/RestClient';

import { getSpellerApiUrl } from './spellerProviderHelper';

let SPELLER_API_URL: string | undefined = undefined;

interface IRestResult {
  html: string;
  errata_count: number;
  origin_html: string;
  notag_html: string;
}

interface IRestMessage {
  result: IRestResult;
  error: string;
}

interface IRestResponse {
  message: IRestMessage;
}

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
    let rest = new RestClient(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36 Edg/117.0.2045.36'
    );
    let response = await rest.get<IRestResponse>(SPELLER_API_URL! + encodeURIComponent(textChunk));
    if (response.statusCode !== 200) {
      throw new Error(`Http error: ${response.statusCode}`);
    } else if (response.result === null) {
      throw new Error('Http result is null');
    } else if (response.result.message.error !== undefined) {
      if (response.result.message.error === '유효한 키가 아닙니다.') {
        SPELLER_API_URL = undefined;
        throw new Error('Http error: Temporary Error Occurred. Please Try Again');
      } else {
        throw new Error(`Http response error: ${response.result.message.error}`);
      }
    }

    return unescape(response.result.message.result.notag_html, eol);
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
