import low from 'lowdb';
import MiniTimer from './modules/miniTimer';

import SlowChinese from './modules/slowChinese';

const db = low('db.json');

let timer = new MiniTimer();

let slowChinese = new SlowChinese(db);

slowChinese.scrape()
  .then((result) => {
    console.log(result);
    console.log('Time elapsed: ' + timer.elapsed() + 's');
  })
  .catch((err) => {
    console.log(err);
  });
