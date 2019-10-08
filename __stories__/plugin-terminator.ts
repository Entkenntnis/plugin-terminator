import { addStory } from '../demo'

addStory('Plugins/Terminator/Initial State', {
  state: {
    plugin: 'rows',
    state: [
      {
        plugin: 'terminator',
        state: {
          catalog: 'kopfeasy',
          size: 3,
          addition: 1,
          subtraction: 1,
          practiceCount: 10
        }
      }
    ]
  }
})
