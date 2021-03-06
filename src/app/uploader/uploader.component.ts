import { Component, OnInit, EventEmitter, Output, Input } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs/Rx';
import { Subject } from 'rxjs/Subject';
import 'rxjs/add/operator/catch';
import 'rxjs/observable/interval';
import {
  EnergyEvaluationRequest,
  EnergyDataResponse,
  CSVData,
  FilePathObject
} from '../model/entities';

@Component({
  selector: 'app-uploader',
  templateUrl: './uploader.component.html',
  styleUrls: ['./uploader.component.css']
})
export class UploaderComponent implements OnInit {

  @Input()
  public HOSTNAME = "";
  public uploadRequests: EnergyEvaluationRequest[] = [];
  public additionalUploadRows: number[] = [];
  public filename: string = "";
  public scriptname: string = "";
  public specificCategories: string[] = [
    "Alarm Clocks", "Dictionary", "Reddit Browsers", "Web Browsers",
    "Email Clients"
  ];
  public generalCategories: string[] = [
    "News", "Gaming", "Business", "Social Media", "Lifestyle", "Productivity",
    "Photography", "Video Players & Editors"
  ];
  public testingMethods: string[] = [
    "Monkeyrunner", "DroidMate-2"
  ];
  // Also sets default selected option to one with value of null
  public selectedCategory: number = null;
  public selectedTestingMethod: string = "DroidMate-2";
  public showLoadingIcon: boolean = false;
  public statementCoverage: boolean = false;
  public clear: Subject<boolean> = new Subject;

  @Output()
  public data: EventEmitter<EnergyDataResponse[]> = new EventEmitter();

  @Output()
  public hideData: EventEmitter<boolean> = new EventEmitter();

  constructor(private http: HttpClient) {
    let firstUploadRow: EnergyEvaluationRequest = {} as EnergyEvaluationRequest;
    this.uploadRequests.push(firstUploadRow);
  }

  ngOnInit() {
  }

  public onFilenameUpdate(filename: string, index: number): void {
    let uploadRequest: EnergyEvaluationRequest = this.uploadRequests[index];
    uploadRequest.filename = filename;
    this.filename = filename;
  }

  public onScriptUpdate(scriptname: string, index: number): void {
    let uploadRequest: EnergyEvaluationRequest = this.uploadRequests[index];
    uploadRequest.scriptname = scriptname;
    this.scriptname = scriptname;
  }

  public onUploadButtonClick(): void {
    this.showLoadingIcon = true;
    this.sendEnergyRequest()
      .subscribe((messages: EnergyDataResponse[]) => {
        console.log("Emitting data");
        this.showLoadingIcon = false;
        this.data.emit(messages);
      });
    setTimeout(() => document.getElementById("loader")
      .scrollIntoView({behavior: 'smooth', block: "end"})
    , 500);
    //this.data.emit(this.testData());
  }

  public isDisabled(): boolean {
    return (this.filename == ""
      || this.selectedCategory == null || !this.selectedTestingMethod) ||
      (this.selectedTestingMethod == 'Monkeyrunner' && !this.scriptname);
}

  public onSelectChange(selected: string): void {
    console.log(selected);
  }

  public onClearButtonClick(): void {
    this.clear.next(true);
    this.filename = "";
    this.scriptname = "";
    this.selectedCategory = null;
    this.hideData.emit(true);
    this.sendClearRequest().subscribe();
  }

  public methodSelected(selection: string): boolean {
    return this.selectedTestingMethod == selection;
  }

  public addRow(): void {
    this.additionalUploadRows.push(Date.now());
    let newUploadRequest: EnergyEvaluationRequest = {} as EnergyEvaluationRequest;
    this.uploadRequests.push(newUploadRequest);
  }

  public removeRow(index): void {
    this.additionalUploadRows.splice(index, 1);
    this.uploadRequests.splice(index+1, 1);
  }

  public trackByFn(index, item) {
    return item;
  }

  private sendClearRequest(): Observable<boolean> {
    let fileObj: FilePathObject = {apps: [], scripts: []};
    this.uploadRequests
    .forEach(uploadRequest => {
      if (uploadRequest.filename != undefined && uploadRequest.filename != "") {
        fileObj.apps.push(uploadRequest.filename);
      }
      if (uploadRequest.scriptname != undefined &&
          uploadRequest.scriptname != "") {
        fileObj.scripts.push(uploadRequest.scriptname);
      }
    });
    if (fileObj.apps.length == 0 && fileObj.scripts.length == 0) {
      return Observable.of(true);
    }
    return this.http.post<boolean>(this.HOSTNAME + '/clear/', fileObj)
      .catch((error: any) => {
        console.log(error);
        return Observable.of(false);
      });
  }

  private sendEnergyRequest(): Observable<EnergyDataResponse[]> {
    let energyRequests: EnergyEvaluationRequest[] = this.uploadRequests
    .filter(uploadRequest => {
      if (uploadRequest.filename == undefined) return false;
      if (this.selectedTestingMethod == 'Monkeyrunner') {
        return uploadRequest.scriptname != undefined;
      } else {
        return true;
      }
    })
    .map((uploadRequest) => {
      uploadRequest.category = this.selectedCategory.toString();
      uploadRequest.method = this.selectedTestingMethod;
      uploadRequest.statementCoverage = this.statementCoverage;
      return uploadRequest;
    });
    return this.http.post<EnergyDataResponse[]>(this.HOSTNAME + '/energy-eval/',
       energyRequests)
        .catch((error: any) => {
          console.log(error);
          console.log("Returning test data");
          return Observable.of(this.emptyResponse());
        });
  }

  private emptyResponse(): EnergyDataResponse[] {
    let emptyResponse = {} as EnergyDataResponse;
    return [emptyResponse];
  }

}
