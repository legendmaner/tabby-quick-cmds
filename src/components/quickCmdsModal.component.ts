import { Component } from '@angular/core'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { ConfigService, AppService, BaseTabComponent, SplitTabComponent } from 'terminus-core'
import { QuickCmds } from '../api'
import { BaseTerminalTabComponent as TerminalTabComponent } from 'terminus-terminal';


@Component({
    template: require('./quickCmdsModal.component.pug'),
    styles: [require('./quickCmdsModal.component.scss')],
})
export class QuickCmdsModalComponent {
    cmds: QuickCmds[]
    quickCmd: string
    commAppendCR: boolean
    selectedIndex = -1
    filteredCmds: QuickCmds[] = []

    constructor (
        public modalInstance: NgbActiveModal,
        private config: ConfigService,
        private app: AppService
    ) { }

    ngOnInit () {
        this.cmds = this.config.store.qc.cmds
        this.commAppendCR = this.config.store.qc.commAppendCR
        this.refresh()
    }

    handleKeyDown (event: KeyboardEvent) {
        if (event.key === 'ArrowUp') {
            this.selectedIndex = Math.max(0, this.selectedIndex - 1)
            event.preventDefault()
        } else if (event.key === 'ArrowDown') {
            this.selectedIndex = Math.min(this.filteredCmds.length - 1, this.selectedIndex + 1)
            event.preventDefault()
        } else if (event.key === 'Enter') {
            if (this.selectedIndex >= 0) {
                this.send(this.filteredCmds[this.selectedIndex], null)
            } else {
                this.quickSend()
            }
        }
    }

    quickSend () {
        if (this.selectedIndex >= 0) {
            this.send(this.filteredCmds[this.selectedIndex], null)
        } else {
            this._send(this.app.activeTab, this.quickCmd, this.commAppendCR)
            this.close()
        }
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
        if (event && event.ctrlKey) {
            this._sendAll(cmd.text, cmd.appendCR)
        }
        else {
            this._send(this.app.activeTab, cmd.text, cmd.appendCR)
        }
        this.close()
    }

    refresh () {
        this.selectedIndex = -1

        if (this.quickCmd) {
            const searchTerm = this.quickCmd.toLowerCase();
            this.filteredCmds = this.cmds.filter(cmd => {
                const searchableText = (cmd.name || '') + (cmd.group || '') + (cmd.text || '');
                return searchableText.toLowerCase().includes(searchTerm);
            });
        } else {
            this.filteredCmds = this.cmds
        }
    }
}
