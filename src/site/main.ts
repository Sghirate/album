import gallery from './gallery';
import loca from './loca';
import map from './map';
import state from './state';
import TagsModule from './tags';


state.init();
loca.init('loca');

const tags = new TagsModule();
tags.init('tags');

map.init('map');
gallery.init('gallery');
