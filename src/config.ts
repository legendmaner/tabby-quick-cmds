import { ConfigProvider } from 'terminus-core'

export class QuickCmdsConfigProvider extends ConfigProvider {
    defaults = {
        qc: {
            cmds: [],
            commAppendCR: false
        },
        hotkeys: {
            'qc': [
                'Alt-Q',
            ],
        },
    }

    platformDefaults = { }
}
