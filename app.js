import low from 'lowdb';

import scrapeUri from './modules/scrapeUri';
import { getMp3, getContent, getList } from './modules/slowChinese';

const db = low('db.json');

const indexUri = 'http://www.slow-chinese.com/podcast/';

// @TODO pull this out into a slowChinese module
function scrapePost(uri) {
  return new Promise((resolve, reject) => {
    scrapeUri(uri)
      .then(($) => {
        const scrapedData = {
          mp3: getMp3($),
          content: getContent($)
        };

        // @TODO: put this after resolving instead
        db.get('posts')
          .find({ url: uri })
          .assign(scrapedData)
          .value();

        console.log('Scraped ' + scrapedData.content.length +
                    ' paragraphs from ' + uri);
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

    // *** get post list
    let fullList = getList($);

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

      if (!db.get('posts').find({id: post.id}).value().content) {
        // post has not been scraped yet
        postsToScrape.push(post);
      }
    });

    console.log('Scraping ' + postsToScrape.length +
                '/' + fullList.length + ' posts...');

    let p = Promise.resolve();
    postsToScrape.forEach((post) => {
      p = p.then(() => scrapePost(post.url));
    });

  })
  .catch((err) => {
    // something went wrong with the request
    console.log(err);
  });
