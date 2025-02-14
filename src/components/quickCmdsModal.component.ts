import { Component } from '@angular/core'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { ConfigService, AppService, BaseTabComponent, SplitTabComponent } from 'terminus-core'
import { QuickCmds, ICmdGroup } from '../api'
import { BaseTerminalTabComponent as TerminalTabComponent } from 'terminus-terminal';


@Component({
    template: require('./quickCmdsModal.component.pug'),
    styles: [require('./quickCmdsModal.component.scss')],
})
export class QuickCmdsModalComponent {
    cmds: QuickCmds[]
    quickCmd: string
    commAppendCR: boolean
    childGroups: ICmdGroup[]
    groupCollapsed: {[id: string]: boolean} = {}

    constructor (
        public modalInstance: NgbActiveModal,
        private config: ConfigService,
        private app: AppService,
    ) { }

    ngOnInit () {
        this.cmds = this.config.store.qc.cmds
        this.commAppendCR = this.config.store.qc.commAppendCR
        const _groups = this.cmds.map(_cmd => _cmd.group)
        _groups.forEach(group => {
                this.groupCollapsed[group] = true
        })
        this.refresh()
    }

    onCommAppendCRChange () {
        if (this.commAppendCR != this.config.store.qc.commAppendCR) {
            this.config.store.qc.commAppendCR = this.commAppendCR
            this.config.save()
            this.refresh()
        }
    }

    quickSend () {
        this._send(this.app.activeTab, this.quickCmd, this.commAppendCR)
        this.close()
    }

    quickSendAll() {
        this._sendAll(this.quickCmd, this.commAppendCR)
        this.close()
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async _send (tab: BaseTabComponent, cmd: string, appendCR: boolean) {    
        
        if (tab instanceof SplitTabComponent) {
            this._send((tab as SplitTabComponent).getFocusedTab(), cmd, appendCR)
        }
        if (tab instanceof TerminalTabComponent) {
            let currentTab = tab as TerminalTabComponent

            console.log("Sending full " + cmd);

            let cmds=cmd.split(/(?:\r\n|\r|\n)/);
            let full_cmds = "";

            for(let cmd of cmds) {
                console.log("Sending subcommand " + cmd);

                if (cmd.length == 0) {
                    continue;
                }

                if (full_cmds.length > 0){
                    full_cmds += " && ";
                }

                if(cmd.startsWith('\\s')){
                    cmd=cmd.replace('\\s','');
                    let sleepTime=parseInt(cmd);

                    await this.sleep(sleepTime);

                    console.log('sleep time: ' + sleepTime);
                    continue;
                }

                if(cmd.startsWith('\\x')){
                    cmd = cmd.replace(/\\x([0-9a-f]{2})/ig, function(_, pair) {
                            return String.fromCharCode(parseInt(pair, 16));
                        });
                }

                full_cmds += cmd;
            }

            if (full_cmds.length > 0){
                currentTab.sendInput(full_cmds + (this.commAppendCR || appendCR ? "\n" : ""));
            }
        }
    }

    _sendAll (cmd: string, appendCR: boolean) {
        for (let tab of this.app.tabs) {
            if (tab instanceof SplitTabComponent) {
                for (let subtab of (tab as SplitTabComponent).getAllTabs()) {
                    this._send(subtab, cmd, appendCR)
                }
            } else {
                this._send(tab, cmd, appendCR)
            }
        }
    }

    close () {
        this.modalInstance.close()
        this.app.activeTab.emitFocused()
    }

    send (cmd: QuickCmds, event: MouseEvent) {
        if (event.ctrlKey) {
            this._sendAll(cmd.text, cmd.appendCR)
        }
        else {
            this._send(this.app.activeTab, cmd.text, cmd.appendCR)
        }
        this.close()
    }

    clickGroup (group: ICmdGroup, event: MouseEvent) {
        if (event.shiftKey) {
            if (event.ctrlKey) {
                for (let cmd of group.cmds) {
                    this._sendAll(cmd.text, cmd.appendCR)
                }
            }
            else {
                for (let cmd of group.cmds) {
                    this._send(this.app.activeTab, cmd.text, cmd.appendCR)
                }
            }
        }
        else {
            this.groupCollapsed[group.name] = !this.groupCollapsed[group.name]
        }
    }

    refresh () {
        this.childGroups = []

        let cmds = this.cmds
        if (this.quickCmd) {
            cmds = cmds.filter(cmd => (cmd.name + cmd.group + cmd.text).toLowerCase().includes(this.quickCmd))
        }

        for (let cmd of cmds) {
            cmd.group = cmd.group || null
            let group = this.childGroups.find(x => x.name === cmd.group)
            if (!group) {
                group = {
                    name: cmd.group,
                    cmds: [],
                }
                this.childGroups.push(group)
            }
            group.cmds.push(cmd)
        }
    }
}
