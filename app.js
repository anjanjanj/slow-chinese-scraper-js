import rp from 'request-promise-native';
import cheerio from 'cheerio';
import low from 'lowdb';

const db = low('db.json');

const uri = 'http://www.slow-chinese.com/podcast/';

var options = {
  uri: uri,
  transform: function(body) {
    return cheerio.load(body);
  }
};

console.log('Opening connection to ' + uri);
rp(options)
  .then(function($) {
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
        console.log('post', post.id, 'already scraped, ignoring!');
      }
      else {
        // post has not been scraped yet
        console.log('post', post.id, 'not yet scraped, going to scrape');
        postsToScrape.push(post.id);
      }
    });

    // *** @TODO: start to go through scrape posts individually and scrape text and mp3 url


  })
  .catch(function(err) {
    // something went wrong with the request
    console.log(err);
  });
