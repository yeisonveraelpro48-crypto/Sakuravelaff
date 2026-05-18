const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys')
const qrcode = require('qrcode-terminal')

let userCoins = {}

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info')
    const sock = makeWASocket({ auth: state })

    sock.ev.on('connection.update', (update) => {
        const { connection, qr } = update
        if (qr) qrcode.generate(qr, { small: true })
        if (connection === 'open') console.log('Bot conectado!')
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0]
        if (!msg.message || msg.key.fromMe) return

        const from = msg.key.remoteJid
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text
        const sender = from.split('@')[0]

        if (!userCoins[sender]) userCoins[sender] = 100

        if (text === '!saldo') {
            await sock.sendMessage(from, { text: `Tienes ${userCoins[sender]} monedas 🪙` })
        }

        if (text.startsWith('!tirar')) {
            const apuesta = parseInt(text.split(' ')[1])
            if (!apuesta || apuesta <= 0) return sock.sendMessage(from, { text: 'Usa:!tirar 50' })
            if (userCoins[sender] < apuesta) return sock.sendMessage(from, { text: 'No tienes suficientes monedas' })

            const resultado = Math.random() > 0.5? 'ganaste' : 'perdiste'
            if (resultado === 'ganaste') {
                userCoins[sender] += apuesta
                await sock.sendMessage(from, { text: `Ganaste! Ahora tienes ${userCoins[sender]} monedas 🪙` })
            } else {
                userCoins[sender] -= apuesta
                await sock.sendMessage(from, { text: `Perdiste! Te quedan ${userCoins[sender]} monedas 🪙` })
            }
        }

        if (text === '!ayuda') {
            await sock.sendMessage(from, {
                text: 'Comandos:\n!saldo - Ver tus monedas\n!tirar 50 - Apostar 50 monedas 50/50'
            })
        }
    })
}

startBot()
