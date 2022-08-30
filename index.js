const express = require('express');

const app = express();

const server = require('http').createServer(app);

const ytsr = require('ytsr')

const ytdl = require('ytdl-core')

const jwt = require('jsonwebtoken')

const cors = require('cors')

app.use(cors({
  origin: "*"
}))

app
  .get("/api/continuation", (req, res) => {

    const token = req.headers.authorization;

    const {payload} = jwt.decode(token.split("Bearer")[1].trim(), {complete: true});

    ytsr.continueReq(payload.continuation)
    .then(result => {

      const tokenContinuation = jwt.sign({continuation: result.continuation}, "Unicorn <3")

      res.json({
        items: result.items,
        tokenContinuation
      })

    })
    .catch(error => {
      res.statusCode = 500
      res.json({
        message: error?.message
      })
    })

  })
  .get("/api/search/:q", (req, res) => {

    ytsr.getFilters(req.params.q)
    .then(filters => {
      const filter = filters.get("Type").get("Video")

      ytsr(filter.url, {
        pages: 1
      })
      .then(result => {

        const tokenContinuation = jwt.sign({continuation: result.continuation}, "Unicorn <3")

        res.json({
          items: result.items,
          tokenContinuation
        })
      })
      .catch(error => {
        res.statusCode = 500
        res.json({
          message: error?.message
        })
      })
    })
    .catch(error => {
      res.statusCode = 500
      res.json({
        message: error?.message
      })
    })

  })
  .get("/api/music/:id", (req, res) => {

    ytdl.getInfo(req.params.id)
    .then(videoInfo => {
      res.json({
        details: {
          title: videoInfo.videoDetails.title,
          lengthSeconds: videoInfo.videoDetails.lengthSeconds,
          isFamilySafe: videoInfo.videoDetails.isFamilySafe,
          viewCount: videoInfo.videoDetails.viewCount,
          publishDate: videoInfo.videoDetails.publishDate,
          ownerChannelName: videoInfo.videoDetails.ownerChannelName,
          videoId: videoInfo.videoDetails.videoId,
          keywords: videoInfo.videoDetails.keywords,
          likes: videoInfo.videoDetails.likes,
          thumbnails: videoInfo.videoDetails.thumbnails,
          author: {
            id: videoInfo.videoDetails.author.id,
            name: videoInfo.videoDetails.author.name,
            thumbnails: videoInfo.videoDetails.author.thumbnails,
            verified: videoInfo.videoDetails.author.verified,
            subscriber_count: videoInfo.videoDetails.author.subscriber_count
          }
        },
        relatedVideos: videoInfo.related_videos,
        formats: ytdl.filterFormats(videoInfo.formats, "audioonly").map(format => ({
          mimeType: format.mimeType,
          quality: format.quality,
          audioQuality: format.audioQuality,
          approxDurationMs: format.approxDurationMs,
          url: format.url
        }))
      })
    })
    .catch(error => {
      res.statusCode = 500
      res.json({
        message: error?.message
      })
    })

  })
  .get("/api/download/:id", (req, res) => {

    const range = req.headers.range;
    if (!range) {
        res.status(400).send("Requires Range header");
    }

    ytdl.getInfo(req.params.id)
    .then(videoInfo => {

      const format = ytdl.filterFormats(videoInfo.formats, "audioonly")[0];

      const inputStream = ytdl(`http://www.youtube.com/watch?v=${req.params.id}`, {
        format
      });

      const contentLength = parseInt(format.contentLength);
      const CHUNK_SIZE = 10 ** 6; // 1MB

      console.log(range);
      const start = Number(range.replace(/\D/g, ""));
      const end = Math.min(start + CHUNK_SIZE, contentLength - 1);

      res.writeHead(206, {
        "Content-Type": "audio/mp3",
        "Accept-Ranges": "bytes",
        "Content-Range": `bytes ${start}-${end}/${contentLength}`,
        "Content-Length": contentLength
      })

      inputStream.pipe(res);
    })

  })
;

server.listen(process.env.PORT || 3000, () => {
  console.log("echo API listen: ", server.address());
});
