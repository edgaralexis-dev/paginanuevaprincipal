import { apiGet } from './apiClient';

export type CarouselEvent = {
  codigo: number;
  codigoEvento: number;
  nombreEvento: string;
  ubicacion: string;
  artista: string;
  fechaEvento: string;
  urlImagen: string;
  orden: number;
  ancho: string;
  alto: string;
  codigoTipo: number;
  nombreTipo: string;
  [k: string]: unknown;
};

export async function getCarouselByCountry(idPais: number): Promise<CarouselEvent[]> {
  return apiGet<CarouselEvent[]>(`/primetixapi/api/Imagen/ObtieneCarrousel/${idPais}`);
}
