// https://github.com/Bostonhacks/inviare/blob/master/functions/index.js
// https:// firebase.google.com/docs/storage/extend-with-functions
// firebase.google.com/docs/firestore/extend-with-functions
import * as functions from "firebase-functions";
import busboy from "busboy";
import {simpleParser} from "mailparser";
import os from "os";
import fs from "fs/promises";
import path from "path";
import {spawn} from "child-process-promise";
import admin from "firebase-admin";

admin.initializeApp();
const bucket = admin.storage().bucket("attachments");
const collection = admin.firestore().collection("submissions");

export const sendgrid = functions.https.onRequest(async (req, res) => {
  const bb = busboy({headers: req.headers});
  const form: Map<string, any> = new Map();
  bb.on("field", (k, v) => form.set(k, v));
  bb.on("finish", async () => {
    const parsed = await simpleParser(form.get("email"), {
      skipImageLinks: true,
    });
    const imageLinks = await Promise.all(
        parsed.attachments
            .filter((attachment) => attachment.contentType.startsWith("image"))
            .map(async (attachment) => {
              const attachmentFilename = [
                "attachment",
                parsed.date?.toISOString().replace(/[:.]/g, "-"),
                attachment.cid,
              ].join("-");
              const tmpBaseFilename = path.join(os.tmpdir(), attachmentFilename);
              const tmpOriginalFilename =
            tmpBaseFilename + path.extname(attachment.filename ?? "");
              const tmpConvertedFilename = tmpBaseFilename + ".png";
              await fs.writeFile(tmpOriginalFilename, attachment.content);
              await spawn(
                  "convert",
                  // eslint-disable-next-line max-len
                  [
                    tmpOriginalFilename,
                    "-resize",
                    "1000x1000>",
                    "-colors",
                    "255",
                    "-density",
                    "72",
                    tmpConvertedFilename,
                  ],
                  {capture: ["stderr"]}
              ).catch((err) => {
                functions.logger.error(
                    // checkme could handle errors better?
                    "caught error in conversion",
                    err.message,
                    err.stderr
                );
                return null;
              });
              if (tmpConvertedFilename !== tmpOriginalFilename) {
                await fs.unlink(tmpOriginalFilename);
              }
              // todo metadata?
              await bucket.upload(tmpConvertedFilename, {
                destination: path.basename(tmpConvertedFilename),
              });
              await fs.unlink(tmpConvertedFilename);
              return tmpConvertedFilename;
            })
    );
    const email = {
      subject: parsed.subject,
      from: parsed.from?.value,
      attachmnents: imageLinks,
      text: parsed.text,
    };
    functions.logger.log(
        "submission:",
        email,
        "->",
        (await collection.add(email)).id
    );
  });
  bb.end(req.rawBody);
  res.sendStatus(200);
});
