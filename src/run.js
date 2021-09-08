// Soketas yra kanalas, per kuri ateis uzklausos is narsykles. Duomenys vaiksto tam tikro dydzio paketais.
// Jei siunciam dideli informacijos kieki

import * as net from "net";
import * as path from "path";
import * as fs from "fs/promises";
import { readdir } from 'fs/promises';    // or just fs.readdir

// console.log('----------------\n', path);
const WEB = "web";
const PORT = 3000;

function readHeaders(socket) {
  return new Promise((resolve, reject) => {
    // persiskaitom pirma eilute ir tik hederius. kitaips sakant skaitom iki pirmos tuscios eilutes, o tai ir yra headeriai
    let res = "";
    socket.setEncoding("utf8");
    socket.on("data", (data) => {
      // gaunam visa informacija pakeitais ir juos sumuojam i res
      res += data;
      const lines = data.split("\r\n");
      for (const line of lines) {
        if (line === "") {
          resolve(res);
          return
        }
      }
    });
    // jeigu ivyko eventas end vadinasi daugiau paketu nebeateis
    socket.on("end", () => {
      resolve(res);
    });
    socket.on("error", (err) => {
      reject(err);
    });
  });
}
//-------------------------------------------------------

async function handler(socket) {
  try {
    const data = await readHeaders(socket);
    // console.log('HEADERS ', data);
    const lines = data.split("\r\n");
    // console.log('LINE0 ', lines[0]);
    let [, resource] = lines[0].split(" ");
    const f = path.join(WEB, resource);
    resource += resource.endsWith('/') ? '' : '/';
    console.log('RESOURCE ', resource);

    if ((await fs.stat(f)).isDirectory()) {
      console.log(`Sio katalogo "${f}" turinys:`);
      const files = await readdir(f);
      let fileType = '';
      let response = '';
      let res = '';
      for (const file of files) {
        fileType = (await fs.stat(f + '/' + file)).isFile() ? '(Failas)' : '(Katalogas)';
        console.log(`${file} ${fileType}`);

        response += `<li><a href="${resource + file}">${file}</a>&nbsp;&nbsp;&nbsp; <span style='font-size: 0.7em'>${fileType}</span></li>\n`;
      }
      res += "HTTP/1.1 200 OK\r\n";
      res += "\r\n";
      res += '<html>\n';
      res += '<body>\n';
      res += `<b>Katalogo "${f}" turinys:</b>`;
      res += response;
      res += '<body>\n';
      res += '</body>\n';
      socket.write(res, "utf8");
      console.log('------------');
    } else if ((await fs.stat(f)).isFile()) {
      let res = "";
      try {

        const response = await fs.readFile(f, {
          encoding: "utf8"
        });

        res += "HTTP/1.1 200 OK\r\n";
        res += "\r\n";
        res += response;
      } catch (err) {
        res += "HTTP/1.1 404 Not Found\r\n";
        res += "\r\n";
      }
      socket.write(res, "utf8");
    }
  } catch (err) {
      // console.log('FROM ERROR:', fsPromises.readdir(path));
      console.log("Klaida", err);
      let res = "HTTP/1.1 400 Bad Request\r\n";
      res += "\r\n";
      res += 'NERA TOKIO FAILO AR KATALOGO, ZIUREK KA RASAI!'
      socket.write(res, "utf8");
  } finally {
      socket.end();
  }
}

const srv = net.createServer(handler);
srv.listen(PORT);
console.log("Server started");

