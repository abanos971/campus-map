class App {
    constructor() {
        this.init();
    }

    init() {
        console.log('App initialized');
        this.render();
    }

    render() {
        const root = document.getElementById('root');
        root.innerHTML = '<h1>Campus Map</h1>';
    }
}

export default App;
