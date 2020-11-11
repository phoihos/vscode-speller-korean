import * as restm from 'typed-rest-client/RestClient';

const SPELLER_API_URL = 'https://m.search.naver.com/p/csearch/ocontent/util/SpellerProxy?color_blindness=0&q=';

interface IRestResult {
    html: string;
    errata_count: number;
    origin_html: string;
    notag_html: string;
}

interface IRestMessage {
    result: IRestResult;
}

interface IRestResponse {
    message: IRestMessage;
}

function unescape(str: string, eol: string) {
    return str.replace(/<br>/g, eol)
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"');
}

async function correctTextChunk(textChunk: string, eol: string, onError?: (message: string) => void) {
    try {
        let rest = new restm.RestClient('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.102 Safari/537.36');
        let response = await rest.get<IRestResponse>(SPELLER_API_URL + encodeURIComponent(textChunk));
        if (response.statusCode != 200)
            throw new Error(`HTTP Error: ${response.statusCode}`);
        else if (response.result == null)
            throw new Error('HTTP Result is null');

        return unescape(response.result.message.result.notag_html, eol);
    }
    catch (e) {
        console.error((<Error>e).message);
        onError?.((<Error>e).message);

        return textChunk;
    }
};

export const MAX_CHUNK_SIZE = 500;

export async function correctText(text: string, eol: string, onStep?: () => void, onError?: (message: string) => void) {
    let correctedText = "";

    const chunkCount = Math.floor((text.length - 1) / MAX_CHUNK_SIZE) + 1;
    for (let i = 0; i < chunkCount; ++i) {
        const from = i * MAX_CHUNK_SIZE;
        const length = Math.min(text.length - from, MAX_CHUNK_SIZE);

        onStep?.();
        correctedText += await correctTextChunk(text.substr(i * MAX_CHUNK_SIZE, length), eol, onError);
    }

    return correctedText;
}
