import rp from 'request-promise-native';
import cheerio from 'cheerio';

export default function scrapeUri(uri) {
  const options = {
    uri: uri,
    transform: function(body) {
      return cheerio.load(body);
    }
  };

  console.log('Grabbing ' + uri);
  return rp(options);
}
