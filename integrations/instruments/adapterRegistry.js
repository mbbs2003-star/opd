'use strict';
const {SUPPORTED,getAdapter}=require('./baseAdapter');
module.exports={SUPPORTED,getAdapter,listSupportedAdapters(){return Object.entries(SUPPORTED).map(([code,definition])=>({code,...definition}));}};
