import franc from 'franc';
import scrapeUri from './scrapeUri';

class SlowChinesePost {
  constructor(cheerioObject) {
    this.$ = cheerioObject;
  }

  _mp3() {
    let $ = this.$;
    return $('a').filter((i, elem) => {
      return /http.+\.mp3/.test($(elem).attr('href'));
    }).attr('href');
  }

  _content() {
    let $ = this.$;
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

  getData() {
    return {
      mp3: this._mp3(),
      content: this._content()
    };
  }
}

class SlowChineseIndex {
  constructor(cheerioObject) {
    this.$ = cheerioObject;
  }

  getData() {
    let $ = this.$;
    let postElements = $('article h2 a');

    console.log(postElements.length + ' articles found...');

    let fullList = [];

    $(postElements).each((i, elem) => {
      // get url of this post
      const url = $(elem).attr('href');

      // use a regex to get the post id and title from its link text
      const re = /(\d+):?\s*(.+)/;
      let numberAndTitle = $(elem).text();

      let match = re.exec(numberAndTitle);

      const [episodeNumber, episodeTitle] = [match[1], match[2]]
        .map((str) => str.trim());

      fullList.push({
        id: episodeNumber,
        title: episodeTitle,
        url: url
      });
    });

    return fullList;
  }
}

const defaultOptions = {
  dbObjectName: 'posts',
  indexUrl: 'http://www.slow-chinese.com/podcast/'
};

export default class SlowChinese {
  constructor(db, options) {
    this.db = db;
    this.options = Object.assign({}, defaultOptions, options);;
  }

  _getListOfPostsToScrape(list) {
    return list.filter((post) =>
      !this.db.get(this.options.dbObjectName).find({ id: post.id }).value().content
    );
  }

  _saveUnseenIndexPosts(list) {
    let db = this.db;

    list.forEach((post) => {
      if (!db.get(this.options.dbObjectName).find({id: post.id}).value()) {
        // if this post hasn't been saved yet in the database at all, save it
        db.get(this.options.dbObjectName)
          .push(post)
          .value();
      }
    });
  }

  _scrapePostAndSave(uri) {
    let db = this.db;
    return new Promise((resolve, reject) => {
      scrapeUri(uri)
        .then(($) => {
          let post = new SlowChinesePost($);
          const scrapedData = post.getData();

          db.get(this.options.dbObjectName)
            .find({ url: uri })
            .assign(scrapedData)
            .value();

          console.log('Scraped ' + scrapedData.content.length +
                      ' paragraphs from ' + uri + '\n');
          resolve(scrapedData);
        })
        .catch((err) => {
          console.log(err);
          reject(err);
        });
    });
  }

  _getIndexData(uri) {
    return new Promise((resolve, reject) => {
      scrapeUri(uri)
        .then(($) => {
          // scraped successfully, get post list
          let index = new SlowChineseIndex($);
          let fullList = index.getData();
          resolve(fullList);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  scrape() {
    let db = this.db;

    return new Promise((resolve, reject) => {
      // first scrape index post listing
      this._getIndexData(this.options.indexUrl).then((indexList) => {

        // if the db object doesn't exist, we just save the whole index
        if (!db.has(this.options.dbObjectName).value()) {
          db.set(this.options.dbObjectName, indexList)
            .value();
        }
        else {
          // otherwise save any index posts that haven't been saved yet
          this._saveUnseenIndexPosts(indexList);
        }

        // get a list of all posts that haven't been scraped yet
        let postsToScrape = this._getListOfPostsToScrape(indexList);

        console.log('Scraping ' + postsToScrape.length +
                    '/' + indexList.length + ' new posts...\n');

        // now scrape and save each new post individually
        postsToScrape.reduce((p, post) => {
          return p.then(() => this._scrapePostAndSave(post.url));
        }, Promise.resolve()).then((result) => {
            resolve('Site scraped successfully!');
        })
        .catch((err) => {
          reject(err);
        });

      })
      .catch((err) => {
        reject(err);
      });
    });
  }

}
