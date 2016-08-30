import franc from 'franc';

export function getMp3($) {
  return $('a').filter((i, elem) => {
    return /http.+\.mp3/.test($(elem).attr('href'));
  }).attr('href');
}

export function getContent($) {
  let possibleParagraphs = $('p.powerpress_embed_box').next().find('p')
                            .add($('p.powerpress_embed_box').nextAll('p'));

  return possibleParagraphs.map((i, elem) => {

    const text = $(elem).text();
    // detect for Chinese language text using franc:
    // (to avoid transcripts, comments, etc.)
    if (franc(text, {'whitelist' : ['cmn', 'eng']}) === 'cmn'
      && $(elem).closest('section#comments').length === 0) {
      return text;
    }

  }).get();
}

export function getList($) {
  let postElements = $('article h2 a');

  console.log(postElements.length + ' articles found...');

  let fullList = [];

  $(postElements).each((i, elem) => {
    // @FIXME: do regex instead. some post titles are missing ':'
    // /(\d+):\s*(.+)/
    const url = $(elem).attr('href');

    const [episodeNumber, episodeTitle] = $(elem)
      .text()
      .replace(/^#/, '')
      .split(':')
      .map((str) => str.trim());

    fullList.push({
      id: episodeNumber,
      title: episodeTitle,
      url: url
    });
  });

  return fullList;
}
