import React, { Component } from 'react';
import RecognizerComponent from './components/RecognizerComponent';
import WorkspaceComponent from './components/WorkspaceComponent';
import TranscriptionComponent from './components/TranscriptionComponent';

class MainActivity extends Component {
    state = {
        renderComponent: 'input',
        noteSequence: null,
        changedSequence: null,
        selectedTS: "",
        selectedQZ: 0,
        selectedTP: 0,
    };

    switchComponent = (componentName) => {
        this.setState({ renderComponent: componentName });
    }

    takeOutMusicData = (noteSequence,ts,qz,tp,component) => {
        this.setState({ noteSequence: noteSequence,
                        selectedTS: ts,
                        selectedQZ: qz,
                        selectedTP: tp, 
                        renderComponent: component});
    }

    takeOutChangedMusicData = (changedSequence, component) => {
        this.setState({ changedSequence: changedSequence, renderComponent: component });
    }

    render() {
        let componentToRender;

        switch(this.state.renderComponent) {
            case 'input':
                componentToRender = <RecognizerComponent 
                complete = {this.takeOutMusicData}/>;
                break;
            case 'main':
                componentToRender = <WorkspaceComponent
                complete = {this.takeOutMusicData}
                finish = {this.takeOutChangedMusicData}
                notes = {this.state.noteSequence}
                ts = {this.state.selectedTS}
                tp = {this.state.selectedTP}
                qz = {this.state.selectedQZ} />;
                break;
            case 'output':
                componentToRender = <TranscriptionComponent
                notes = {this.state.changedSequence}
                ts = {this.state.selectedTS}
                tp = {this.state.selectedTP}
                qz = {this.state.selectedQZ}
                 />;
                break;
            default:
                componentToRender = <RecognizerComponent />;
        }

        return (
            <div className='main-activity-container'>
                {componentToRender}
            </div>
        );
    }
}

export default MainActivity;