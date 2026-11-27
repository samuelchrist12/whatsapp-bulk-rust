/**
 * Idempotent compatibility patch for whatsapp-web.js when WhatsApp Web omits WAWebSocketModel.
 * Ensures QR Code generation and post-scan authentication work on fresh laptops without cached web_cache.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const candidates = [
  path.join(ROOT, 'sidecar', 'node_modules', 'whatsapp-web.js', 'src', 'Client.js'),
  path.resolve(ROOT, '..', '04_Scripts_dan_Generator', 'node_modules', 'whatsapp-web.js', 'src', 'Client.js')
];

function patchWwebjs() {
  const targetPath = candidates.find(p => fs.existsSync(p));
  if (!targetPath) {
    console.log('[patch_wwebjs] Client.js not found, skipping.');
    return;
  }

  let src = fs.readFileSync(targetPath, 'utf-8');
  if (src.includes('/* BULK_WA_SOCKET_FALLBACK */')) {
    console.log('[patch_wwebjs] Already patched:', targetPath);
    return;
  }

// 1. Patch needAuthHandle (Client.js ~line 140)
const oldNeedAuth = `            const needAuthHandle = await this.pupPage.waitForFunction(
                () => {
                    const state =
                        window.require?.('WAWebSocketModel')?.Socket?.state;
                    if (
                        !state ||
                        state === 'OPENING' ||
                        state === 'UNLAUNCHED' ||
                        state === 'PAIRING'
                    ) {
                        return false;
                    }
                    return {
                        need: state === 'UNPAIRED' || state === 'UNPAIRED_IDLE',
                        state,
                    };
                },
                { timeout: authTimeout },
            );`;

const newNeedAuth = `            const needAuthHandle = await this.pupPage.waitForFunction(
                () => {
                    /* BULK_WA_SOCKET_FALLBACK */
                    let state = null;
                    try {
                        state = window.require?.('WAWebSocketModel')?.Socket?.state;
                    } catch (e) {}
                    if (state) {
                        if (
                            state === 'OPENING' ||
                            state === 'UNLAUNCHED' ||
                            state === 'PAIRING'
                        ) {
                            return false;
                        }
                        return {
                            need: state === 'UNPAIRED' || state === 'UNPAIRED_IDLE',
                            state,
                        };
                    }
                    try {
                        const conn = window.require?.('WAWebConnModel')?.Conn;
                        if (conn?.wid) {
                            return { need: false, state: 'CONNECTED' };
                        }
                        if (conn?.ref) {
                            return { need: true, state: 'UNPAIRED' };
                        }
                    } catch (e) {}
                    return false;
                },
                { timeout: authTimeout, polling: 500 },
            );`;

if (!src.includes(oldNeedAuth)) {
  throw new Error('[patch_wwebjs] Could not locate needAuthHandle block in Client.js');
}
src = src.replace(oldNeedAuth, newNeedAuth);

// 2. Patch QR listener cleanup (~line 262)
const oldQrCleanup = `                        // Remove QR listener once authentication succeeds
                        window
                            .require('WAWebSocketModel')
                            .Socket.on('change:hasSynced', () => {
                                window
                                    .require('WAWebConnModel')
                                    .Conn.off('change:ref', onRefChange);
                            });`;

const newQrCleanup = `                        // Remove QR listener once authentication succeeds
                        window
                            .require?.('WAWebSocketModel')
                            ?.Socket?.on('change:hasSynced', () => {
                                window
                                    .require('WAWebConnModel')
                                    .Conn.off('change:ref', onRefChange);
                            });
                        window
                            .require?.('WAWebConnModel')
                            ?.Conn?.on('change:wid', () => {
                                window
                                    .require('WAWebConnModel')
                                    .Conn.off('change:ref', onRefChange);
                            });`;

if (!src.includes(oldQrCleanup)) {
  throw new Error('[patch_wwebjs] Could not locate QR cleanup block in Client.js');
}
src = src.replace(oldQrCleanup, newQrCleanup);

// 3. Patch post-auth Socket listener (~line 391)
const oldPostAuth = `            await this.pupPage.evaluate(() => {
                const Socket = window.require('WAWebSocketModel').Socket;
                const Cmd = window.require('WAWebCmd').Cmd;

                const listeners = [
                    [
                        Socket,
                        'change:state',
                        (_AppState, state) => {
                            window.onAuthAppStateChangedEvent(state);
                        },
                    ],
                    [
                        Socket,
                        'change:hasSynced',
                        () => {
                            window.onAppStateHasSyncedEvent();
                        },
                    ],`;

const newPostAuth = `            await this.pupPage.evaluate(() => {
                const Socket = window.require?.('WAWebSocketModel')?.Socket;
                const Conn = window.require?.('WAWebConnModel')?.Conn;
                const Cmd = window.require('WAWebCmd').Cmd;

                const listeners = [
                    ...(Socket ? [
                        [
                            Socket,
                            'change:state',
                            (_AppState, state) => {
                                window.onAuthAppStateChangedEvent(state);
                            },
                        ],
                        [
                            Socket,
                            'change:hasSynced',
                            () => {
                                window.onAppStateHasSyncedEvent();
                            },
                        ],
                    ] : [
                        [
                            Conn,
                            'change:wid',
                            () => {
                                if (Conn?.wid) window.onAppStateHasSyncedEvent();
                            },
                        ],
                    ]),`;

if (!src.includes(oldPostAuth)) {
  throw new Error('[patch_wwebjs] Could not locate post-auth Socket block in Client.js');
}
src = src.replace(oldPostAuth, newPostAuth);

// 4. Patch atomic hasSynced check (~line 484)
const oldHasSynced = `if (Socket.hasSynced === true && !storeInjected) {`;
const newHasSynced = `if ((Socket ? Socket.hasSynced === true : Boolean(Conn?.wid)) && !storeInjected) {`;
if (src.includes(oldHasSynced)) {
  src = src.replace(oldHasSynced, newHasSynced);
}

  fs.writeFileSync(targetPath, src, 'utf-8');
  console.log('[patch_wwebjs] Successfully patched Client.js for WhatsApp Web Socket fallback:', targetPath);
}

if (require.main === module) {
  patchWwebjs();
}

module.exports = patchWwebjs;
