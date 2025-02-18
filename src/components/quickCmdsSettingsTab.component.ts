import { Component } from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { ConfigService } from 'terminus-core'
import { QuickCmds, ICmdGroup } from '../api'
import { EditCommandModalComponent } from './editCommandModal.component'
import { PromptModalComponent } from './promptModal.component'

@Component({
    template: require('./quickCmdsSettingsTab.component.pug'),
    styles: [require('./quickCmdsSettingsTab.component.scss')],
})
export class QuickCmdsSettingsTabComponent {
    quickCmd: string
    commands: QuickCmds[]
    commAppendCR: boolean
    childGroups: ICmdGroup[]
    groupCollapsed: {[id: string]: boolean} = {}

    constructor (
        public config: ConfigService,
        private ngbModal: NgbModal
    ) {
        this.commands = this.config.store.qc.cmds
        this.refresh()
    }

    ngOnInit () {
        this.commAppendCR = this.config.store.qc.commAppendCR
        const _groups = this.commands.map(_cmd => _cmd.group)
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

    createCommand () {
        let command: QuickCmds = {
            name: '',
            text: '',
            appendCR: true,
        }

        let modal = this.ngbModal.open(EditCommandModalComponent)
        modal.componentInstance.command = command
        modal.result.then(result => {
            this.commands.push(result)
            this.config.store.qc.cmds = this.commands
            this.config.save()
            this.refresh()
        })
    }

    editCommand (command: QuickCmds) {
        let modal = this.ngbModal.open(EditCommandModalComponent)
        modal.componentInstance.command = Object.assign({}, command)
        modal.result.then(result => {
            Object.assign(command, result)
            this.config.save()
            this.refresh()
        })
    }

    deleteCommand (command: QuickCmds) {
        if (confirm(`Delete "${command.name}"?`)) {
            this.commands = this.commands.filter(x => x !== command)
            this.config.store.qc.cmds = this.commands
            this.config.save()
            this.refresh()
        }
    }

    addGroup (group: ICmdGroup) {
        let command: QuickCmds = {
            name: '',
            text: '',
            group: group.name,
            appendCR: true,
        }

        let modal = this.ngbModal.open(EditCommandModalComponent)
        modal.componentInstance.command = command
        modal.result.then(result => {
            this.commands.push(result)
            this.config.store.qc.cmds = this.commands
            this.config.save()
            this.refresh()
        })
    }

    editGroup (group: ICmdGroup) {
        let modal = this.ngbModal.open(PromptModalComponent)
        modal.componentInstance.prompt = 'New group name'
        modal.componentInstance.value = group.name
        modal.result.then(result => {
            if (result) {
                for (let connection of this.commands.filter(x => x.group === group.name)) {
                    connection.group = result
                }
                this.config.save()
                this.refresh()
            }
        })
    }

    deleteGroup (group: ICmdGroup) {
        if (confirm(`Delete "${group}"?`)) {
            for (let command of this.commands.filter(x => x.group === group.name)) {
                command.group = null
            }
            this.config.save()
            this.refresh()
        }
    }

    cancelFilter(){
        this.quickCmd=''
        this.refresh()
    }

    refresh () {
        this.childGroups = []

        let cmds = this.commands
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

    clickGroup (group: ICmdGroup) {
        for (const key in this.groupCollapsed) {
            if (!this.groupCollapsed[group.name])
                break
            
            this.groupCollapsed[key] = true
        }
        this.groupCollapsed[group.name] = !this.groupCollapsed[group.name]
    }
   
}
