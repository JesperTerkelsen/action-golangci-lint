// this file comes from https://github.com/actions/setup-go/blob/3b4dc6cbed1779f759b9c638cb83696acea809d1/src/main.ts
// see LICENSE for its license

import * as core from '@actions/core';
import * as io from '@actions/io';
import * as installer from './installer';
import path from 'path';
import cp from 'child_process';
import fs from 'fs';
import {URL} from 'url';

export async function run(versionSpec: string, stable: boolean) {
  try {
    core.info(`Setup go ${stable ? 'stable' : ''} version spec ${versionSpec}`);

    if (versionSpec) {
      let token = core.getInput('token');
      let auth = !token || isGhes() ? undefined : `token ${token}`;

      const installDir = await installer.getGo(versionSpec, stable, auth);

      core.exportVariable('GOROOT', installDir);
      core.addPath(path.join(installDir, 'bin'));
      core.info('Added go to the path');

      let added = await addBinToPath();
      core.debug(`add bin ${added}`);
      core.info(`Successfully setup go version ${versionSpec}`);
    }

    // add problem matchers
    const matchersPath = path.join(__dirname, 'matchers.json');
    core.info(`##[add-matcher]${matchersPath}`);

    // output the version actually being used
    let goPath = await io.which('go');
    let goVersion = (cp.execSync(`${goPath} version`) || '').toString();
    core.info(goVersion);

    core.startGroup('go env');
    let goEnv = (cp.execSync(`${goPath} env`) || '').toString();
    core.info(goEnv);
    core.endGroup();
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error);
    } else {
      core.setFailed(`${error}`);
    }
  }
}

export async function addBinToPath(): Promise<boolean> {
  let added = false;
  let g = await io.which('go');
  core.debug(`which go :${g}:`);
  if (!g) {
    core.debug('go not in the path');
    return added;
  }

  let buf = cp.execSync('go env GOPATH');
  if (buf) {
    let gp = buf.toString().trim();
    core.debug(`go env GOPATH :${gp}:`);
    if (!fs.existsSync(gp)) {
      // some of the hosted images have go install but not profile dir
      core.debug(`creating ${gp}`);
      io.mkdirP(gp);
    }

    let bp = path.join(gp, 'bin');
    if (!fs.existsSync(bp)) {
      core.debug(`creating ${bp}`);
      io.mkdirP(bp);
    }

    core.addPath(bp);
    added = true;
  }
  return added;
}

function isGhes(): boolean {
  const ghUrl = new URL(process.env['GITHUB_SERVER_URL'] || 'https://github.com');
  return ghUrl.hostname.toUpperCase() !== 'GITHUB.COM';
}
