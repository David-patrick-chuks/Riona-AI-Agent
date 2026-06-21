import fs from 'fs';
import request from 'request';
import logger from '../config/logger';

export const download = function (
  uri: string,
  filename: string,
  callback: (err?: Error) => void,
): void {
  request.head(uri, function (err: Error | null, _res: request.Response, _body: any) {
    if (err) {
      logger.error(`Error fetching headers for ${uri}: ${err.message}`);
      callback(err);
      return;
    }
    const writeStream = fs.createWriteStream(filename);
    const reqStream = request(uri);
    reqStream.on('error', (streamErr: Error) => {
      logger.error(`Error downloading file from ${uri}: ${streamErr.message}`);
      writeStream.destroy();
      callback(streamErr);
    });
    reqStream.pipe(writeStream);
    writeStream.on('error', (writeErr: Error) => {
      logger.error(`Error writing file ${filename}: ${writeErr.message}`);
      callback(writeErr);
    });
    writeStream.on('finish', () => {
      logger.info(`File downloaded successfully from ${uri} to ${filename}`);
      callback();
    });
  });
};
