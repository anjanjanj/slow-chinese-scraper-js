import rp from 'request-promise-native';
import cheerio from 'cheerio';
import low from 'lowdb';

const db = low('db.json');

const indexUri = 'http://www.slow-chinese.com/podcast/';

function scrapeUri(uri) {
  const options = {
    uri: uri,
    transform: function(body) {
      return cheerio.load(body);
    }
  };

  console.log('Grabbing ' + uri);
  return rp(options);
}

function getMp3($) {
  const mp3Url = $('a').filter((i, elem) => {
    return /http.+\.mp3/.test($(elem).attr('href'));
  }).attr('href');

  return mp3Url;
}

function getContent($) {
  let possibleParagraphs = $('p.powerpress_embed_box').next().find('p');

  return possibleParagraphs.map((i, elem) => {
    // if (isChinese(elem))
    return $(elem).text();
  }).get().join('\n\n');
}

function scrapePost(uri) {
  return new Promise((resolve, reject) => {
    scrapeUri(uri)
      .then(($) => {
        const scrapedData = {
          mp3: getMp3($),
          content: getContent($)
        };

        console.log(scrapedData);
        resolve(scrapedData);
      })
      .catch((err) => {
        console.log(err);
        reject(err);
      });
  });
}

scrapeUri(indexUri)
  .then(($) => {
    // scraped successfully

    // *** get post names

    let postNames = $('article h2 a');

    console.log(postNames.length + ' articles found. Scraping list...');

    let fullList = [];

    $(postNames).each((i, elem) => {
      // @FIXME: do regex instead. some posts are incorrectly titled without ':'
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

    if (!db.has('posts').value()) {
      // first use of database, need to save all posts we received
      db.set('posts', fullList)
        .value();
    }

    let postsToScrape = [];

    fullList.forEach((post) => {
      if (!db.get('posts').find({id: post.id}).value()) {
        // if this post hasn't been saved yet in the database at all, save it
        console.log('saving', post.id);
        db.get('posts')
          .push(post)
          .value();
      }

      if (db.get('posts').find({id: post.id}).value().content) {
        // post has already been scraped
        // console.log('post', post.id, 'already scraped, ignoring!');
      }
      else {
        // post has not been scraped yet
        // console.log('post', post.id, 'not yet scraped, going to scrape');
        postsToScrape.push(post);
      }
    });

    console.log('Scraping ' + postsToScrape.length + ' posts...');
    // console.log('Going to scrape the following ids:', postsToScrape.map((post) => post.id));
    let p = Promise.resolve();
    postsToScrape.forEach((post) => {
      p = p.then(() => scrapePost(post.url));
    });

  })
  .catch((err) => {
    // something went wrong with the request
    console.log(err);
  });
