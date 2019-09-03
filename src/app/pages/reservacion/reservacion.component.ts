import { Component, OnInit, ViewChild } from '@angular/core';
import { BusquedaComponent } from './busqueda/busqueda.component';
import { SeleccionComponent } from './seleccion/seleccion.component';
import { IdentificacionComponent } from './identificacion/identificacion.component';
import { ConfirmacionComponent } from './confirmacion/confirmacion.component';
import { UtilsService } from 'src/app/services/utils.service';

@Component({
  selector: 'app-reservacion',
  templateUrl: './reservacion.component.html',
  styleUrls: ['./reservacion.component.scss']
})
export class ReservacionComponent implements OnInit {

  public curEtapa:number = 0;
  public busquedaInfo:any;
  public paciente:any;
  public calendario:any;
  public reservaRealizada:boolean = false;
  public readQuery:boolean = false;
  public reglasActuales:any = [];
  public codCita:number;
  public valorConvenio:number;

  @ViewChild('tabGroup') tabGroup:any;
  @ViewChild('busqueda') busqueda:BusquedaComponent;
  @ViewChild('seleccion') seleccion:SeleccionComponent;
  @ViewChild('identificacion') identificacion:IdentificacionComponent;
  @ViewChild('confirmacion') confirmacion:ConfirmacionComponent;

  constructor(
    public utils:UtilsService
  ) {

  }

  ngOnInit() {
    this.cambiarEtapa(0);

    this.busqueda.emitBusqueda.subscribe( data => {
      if(data && data.area && data.especialidad && data.centroAtencion){
        console.log(data)
        this.busquedaInfo = data;
        this.cambiarEtapa(1);
      }
    })

    this.seleccion.calendario.subscribe( data => {
      this.cambiarEtapa(2);
      this.calendario = data;
      console.log(this.calendario);
    })

    this.identificacion.datosPaciente.subscribe( data => {
      if(data.reglas && data.reglas.length > 0){
        console.log(this.calendario.cupo.reservable.reservable)
        this.reglasActuales =  { reglas: data.reglas, calendario: this.calendario.cupo.reservable.reservable };
        this.cambiarEtapa(5);
      }else{
        this.cambiarEtapa(3);
        this.paciente = data.paciente;
        this.valorConvenio = data.valorConvenio;

      }
    })

    this.confirmacion.confirmarReserva.subscribe( data => {
      if(data['response']){
        this.cambiarEtapa(4);
        this.reservaRealizada = true;
        this.codCita = data['data']['codCita']
      }
    })
  }

  cambiarEtapa(index:number){
    this.curEtapa = index;
    this.tabGroup.selectedIndex = this.curEtapa;
    window.scrollTo(0, 0);

  }

  nuevaReserva(){
    this.utils.reiniciarReserva();
    this.utils.resetPaciente();
    this.busquedaInfo = null
    this.paciente = null;
    this.calendario = null
    this.reservaRealizada = null;
    this.cambiarEtapa(0);
  }
  
  readQuerySetter(event){
    this.readQuery = event;
  }

  accionValidacionReglas(tipo:string){
    switch(tipo){

      case 'NUEVO' :
        this.nuevaReserva();
      break;

      case 'VOLVER':
        this.reglasActuales = [];
        this.cambiarEtapa(2)
      break;

      case 'CONTINUAR':
        this.reglasActuales = [];
        this.cambiarEtapa(3)
      break;
    }

  }
}
