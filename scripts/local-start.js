import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'package.json'));
const tscJs = require.resolve('typescript/lib/tsc.js');

function viteBin(packageDir) {
    const packageJson = createRequire(path.join(packageDir, 'package.json')).resolve('vite/package.json');
    return path.join(path.dirname(packageJson), 'bin', 'vite.js');
}

const clientVite = viteBin(path.join(root, 'client'));
const adminVite = viteBin(path.join(root, 'admin'));

const useColor = Boolean(process.stdout.isTTY) && process.env.NO_COLOR === undefined;
const reset = useColor ? '\x1b[0m' : '';
const colors = {
    server: useColor ? '\x1b[1;94m' : '',
    client: useColor ? '\x1b[1;92m' : '',
    admin: useColor ? '\x1b[1;95m' : '',
};

const children = new Set();
let shuttingDown = false;
let servicesStarted = false;

function writeLine(name, color, line) {
    process.stdout.write(`${color}[${name}]${reset} ${line.replace(/\r$/, '')}\n`);
}

function pipe(stream, name, color, onText) {
    let pending = '';
    stream.on('data', (chunk) => {
        const text = chunk.toString();
        onText?.(text);
        pending += text;
        const lines = pending.split('\n');
        pending = lines.pop() ?? '';
        for (const line of lines) {
            writeLine(name, color, line);
        }
    });
    stream.on('end', () => {
        if (pending.length > 0) {
            writeLine(name, color, pending);
        }
    });
}

function spawnLogged(args, { cwd, name, color, onText }) {
    const child = spawn(process.execPath, args, {
        cwd,
        env: { ...process.env, FORCE_COLOR: useColor ? '1' : '0' },
        stdio: ['ignore', 'pipe', 'pipe'],
    });
    children.add(child);
    pipe(child.stdout, name, color, onText);
    pipe(child.stderr, name, color, onText);
    child.on('exit', (code, signal) => {
        children.delete(child);
        if (shuttingDown || signal) {
            return;
        }
        if (servicesStarted && children.size === 0) {
            process.exit(code ?? 0);
        }
    });
    child.on('error', (error) => {
        writeLine(name, color, error.message);
        shutdown(1);
    });
    return child;
}

function shutdown(code) {
    if (shuttingDown) {
        return;
    }
    shuttingDown = true;
    for (const child of children) {
        child.kill('SIGTERM');
    }
    setTimeout(() => {
        for (const child of children) {
            child.kill('SIGKILL');
        }
        process.exit(code);
    }, 500).unref();
}

process.on('SIGINT', () => shutdown(130));
process.on('SIGTERM', () => shutdown(143));

const build = spawnLogged([tscJs, '-b', '--pretty', 'false'], {
    cwd: root,
    name: 'server',
    color: colors.server,
});
const [buildCode] = await once(build, 'exit');
if (shuttingDown) {
    process.exit(130);
}
if (buildCode !== 0) {
    process.exit(buildCode ?? 1);
}

let nodeStarted = false;
let watchBuffer = '';

spawnLogged([tscJs, '-b', '--watch', '--preserveWatchOutput', '--pretty', 'false'], {
    cwd: root,
    name: 'server',
    color: colors.server,
    onText(text) {
        if (nodeStarted) {
            return;
        }
        watchBuffer = (watchBuffer + text).slice(-400);
        if (!watchBuffer.includes('Watching for file changes')) {
            return;
        }
        nodeStarted = true;
        spawnLogged(['--watch', 'dist/index.js'], {
            cwd: path.join(root, 'server'),
            name: 'server',
            color: colors.server,
        });
    },
});

spawnLogged([clientVite], {
    cwd: path.join(root, 'client'),
    name: 'client',
    color: colors.client,
});

spawnLogged([adminVite], {
    cwd: path.join(root, 'admin'),
    name: 'admin',
    color: colors.admin,
});

servicesStarted = true;
