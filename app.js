import low from 'lowdb';

import SlowChinese from './modules/slowChinese';

const db = low('db.json');

let slowChinese = new SlowChinese(db);

slowChinese.scrape()
  .then((result) => {
    console.log(result);
  })
  .catch((err) => {
    console.log(err);
  });
