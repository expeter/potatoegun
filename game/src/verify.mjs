import { t, setupLanguageUI } from './i18n.mjs';
import { extractProof,verifyProof,sha256 } from '../../shared/share-proof.mjs';
const $=id=>document.getElementById(id);let request=0;
$('proof-file').addEventListener('change',async()=>{
  const file=$('proof-file').files[0];if(!file)return;const current=++request;
  $('proof-result').textContent=t('Prüfe Bild und Daten …');$('proof-data').textContent='';
  try{
    if(file.size>20*1024*1024)throw Error(t('Datei zu groß (maximal 20 MB).'));
    const proof=extractProof(await file.arrayBuffer());
    if(proof.width!==1200||!((proof.height===756&&proof.protectedHeight===676)||(proof.height===1140&&proof.protectedHeight===900)||(Number.isInteger(proof.height)&&proof.height>=343&&proof.height<=1600&&proof.protectedHeight===proof.height-60)))throw Error(t('Unbekanntes Kartenformat.'));
    const bitmap=await createImageBitmap(file);
    if(bitmap.width!==1200||bitmap.height!==proof.height){bitmap.close();throw Error(t('Die Bildgröße wurde verändert. Bitte das Original-PNG verwenden.'));}
    const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=proof.protectedHeight;const c=canvas.getContext('2d');c.drawImage(bitmap,0,0);bitmap.close();
    const result=verifyProof(proof,c.getImageData(0,0,1200,proof.protectedHeight).data);if(current!==request)return;
    $('proof-result').textContent=result.values&&result.pixels?t('Prüfsummen stimmen: Werte, Looks und Kartenbild sind konsistent. Kein Echtheitsnachweis.'):t`Abweichung gefunden: ${result.values?t('Prüfdaten stimmen.'):t('Prüfdaten verändert.')} ${result.pixels?t('Kartenbild stimmt.'):t('Kartenbild verändert oder neu verarbeitet.')}`;
    $('proof-data').textContent=JSON.stringify(result.payload,null,2);
  }catch(error){if(current===request)$('proof-result').textContent=t(error.message);}
});
$('check-values').addEventListener('click',()=>{
  try{const text=JSON.stringify(JSON.parse($('proof-json').value));$('values-result').textContent=sha256(text)===$('proof-hash').value.trim().toLowerCase()?t('Werte-Prüfsumme stimmt. Bild und Echtheit sind damit nicht geprüft.'):t('Prüfsumme passt nicht. Werte, Reihenfolge oder Code unterscheiden sich.');}catch{$('values-result').textContent=t('Bitte gültige JSON-Prüfdaten eingeben.');}
});

setupLanguageUI();
