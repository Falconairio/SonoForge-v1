import React, { Component } from 'react';
import RecognizerComponent from './components/RecognizerComponent';
import WorkspaceComponent from './components/WorkspaceComponent';
import NotationComponent from './components/NotationComponent';

class MainActivity extends Component {
    state = {
        renderComponent: 'input',
        noteSequence: null,
        selectedTS: "",
        selectedQZ: 0,
        selectedTP: 0,
    };

    switchComponent = (componentName) => {
        this.setState({ renderComponent: componentName });
    }

    takeOutMusicData = (noteSequence,ts,qz,tp) => {
        this.setState({ noteSequence: noteSequence,
                        selectedTS: ts,
                        selectedQZ: qz,
                        selectedTP: tp, 
                        renderComponent: 'main' });
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
                complete = {this.takeOutNoteSequence}
                notes = {this.state.noteSequence}
                ts = {this.state.selectedTS}
                tp = {this.state.selectedTP}
                qz = {this.state.selectedQZ} />;
                break;
            case 'output':
                componentToRender = <NotationComponent />;
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