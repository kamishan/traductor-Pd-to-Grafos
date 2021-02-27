import { Component, OnInit, ViewChild } from '@angular/core';
import { ElementService } from '@data/service/element.service';
import { ToastrService } from 'ngx-toastr';
import { environment } from '@env/environment';
import { MatTableDataSource, MatPaginator } from '@angular/material';
import { Element } from '@data/schema/element.interface';
import { RelationService } from '@data/service/relation.service';
import { ProcessService } from '@data/service/process.service';
import { ProcessModel } from '@data/models/process.model';
import { FormGroup } from '@angular/forms';
import { PermissiveR } from '@data/schema/process.interface';

@Component({
  selector: 'app-permissive-relationship',
  templateUrl: './permissive-relationship.component.html',
  styleUrls: ['./permissive-relationship.component.scss'],
})
export class PermissiveRelationshipComponent implements OnInit {
  public deviceInfo = null;
  public showSpinner: boolean;
  public Form: FormGroup = new ProcessModel().PermissiveRelations();
  public controlled: Array<Element>;
  public actuator: Array<Element> = [];
  public statuses: Array<any> = [];
  public Eventss = [];
  public dataSource: MatTableDataSource<any>;
  public displayedColumns: Array<string> = ['actuator', 'controlled', 'event', 'status', 'actions'];
  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
  public create = false;
  public api = environment.api;
  constructor(
    public serviceElement: ElementService,
    private service: RelationService,
    public Processservice: ProcessService,
    private toast: ToastrService
  ) { }

  ngOnInit(): void {
    this.getElementsActuators();
    this.getElementsControlled();
    if (this.Processservice.IDP !== undefined) {
      this.getPermissiveR();
    }
  }

  Status(id: any) {
    this.statuses = [];
    const RESULT: Array<Element> = this.actuator.filter(
      (element) => element.id === +id.value.id
    );
    this.statuses = RESULT;
  }

  Create() {
    this.create = true;
  }
  getPermissiveR() {
    this.showSpinner = true;
    this.service.getByID(`${this.api}permissive`, this.Processservice.IDP.id).subscribe(
      response => {
        if (response.length > 0) {
          this.dataSource = new MatTableDataSource(response.reverse());
          this.dataSource.paginator = this.paginator;
        }
        this.showSpinner = false;
      },
      () => {
        this.showSpinner = false;
      }
    );
  }
  Cancel() {
    this.create = false;
  }

  Events(controlled: any) {
    this.Eventss = this.serviceElement.proccesElement(controlled);
    return this.Eventss;
  }

  Post(form: FormGroup) {
    const url = `${this.api}permissive`;
    if (!form.invalid) {
      const PERMISSIVE: PermissiveR = {
        actuator: form.value.actuator.id,
        controlled: form.value.controlled.id,
        event: form.value.event,
        process: this.Processservice.IDP.id,
        status: form.value.status,
      };

      this.showSpinner = true;
      this.service.createPermissiveR(url, PERMISSIVE).subscribe(
        () => {
          this.toast.success('Relación permisiva creada correctamente', 'Éxito');
          this.Cancel();
          this.getPermissiveR();
          this.showSpinner = false;
        },
        error => {
          this.showSpinner = false;
          this.toast.error(error.error.message, 'Error');
        }
      );
    }
  }
  delete(id: string) {
    this.service.delete(`${this.api}permissive`, id).subscribe(
      () => {
        this.toast.success('Relación permisiva eliminada correctamente', 'Éxito');
        const data = this.dataSource.data.filter((x: any) => x.id !== id);
        this.dataSource = new MatTableDataSource(data);
        this.dataSource.paginator = this.paginator;
      },
      error => {
        this.toast.error(error.error.message, 'Error');
      }
    );
  }
  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }
  getElementsActuators() {
    this.serviceElement.getAll(`${this.api}element/type/actuator`).subscribe(
      response => {
        this.actuator = response;
      },
      error => {
        this.toast.error(error.error.message, 'Error');
      }
    );
  }
  getElementsControlled() {
    this.serviceElement.getAll(`${this.api}element/type/controlled`).subscribe(
      response => {
        this.controlled = response;
      },
      error => {
        this.toast.error(error.error.message, 'Error');
      }
    );
  }
}
