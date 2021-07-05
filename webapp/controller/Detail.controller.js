sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/export/Spreadsheet",
	"sap/m/MessageToast",
	"com/minda/Forecast/model/formatter"
], function (Controller, JSONModel, Filter, FilterOperator, Spreadsheet, MessageToast, formatter) {
	"use strict";

	return Controller.extend("com.minda.Forecast.controller.Detail", {
		formatter: formatter,
		onInit: function () {
			this.oRouter = this.getOwnerComponent().getRouter();
			this.oRouter.getRoute("master").attachPatternMatched(this._onProductMatched, this);
			this.oRouter.getRoute("detail").attachPatternMatched(this._onProductMatched, this);

		},
		// handleFullScreen: function () {
		// 	this.getView().getModel("detailViewModel").setProperty("/fullScreenButtonVisible", false);
		// 	this.getView().getModel("detailViewModel").setProperty("/exitFSButtonVisible", true);
		// 	this.getOwnerComponent().getModel("layout").setProperty("/layout", "MidColumnFullScreen");
		// },
		// exitFullScreen: function () {
		// 	this.getView().getModel("detailViewModel").setProperty("/exitFSButtonVisible", false);
		// 	this.getView().getModel("detailViewModel").setProperty("/fullScreenButtonVisible", true);
		// 	this.getOwnerComponent().getModel("layout").setProperty("/layout", "TwoColumnsMidExpanded");
		// },
		handleClose: function () {
			// this.getView().getModel("detailViewModel").setProperty("/exitFSButtonVisible", false);
			// this.getView().getModel("detailViewModel").setProperty("/fullScreenButtonVisible", true);
			// this.getOwnerComponent().getModel("layout").setProperty("/layout", "OneColumn");
			this.oRouter.navTo("master");
		},
		_onProductMatched: function (oEvent) {
			this.byId("table").setWidth("100%");
			this._product = oEvent.getParameter("arguments").AgreementNo || this._product || "0";
			var date = new Date(),
				nextMonthDate = new Date();
			nextMonthDate.setDate(date.getDate() + 30);
			var FirstDay = new Date(date.getFullYear(), date.getMonth(), "01");
			this.getView().setModel(new JSONModel({
				nextMonthDate: nextMonthDate,
				fullScreenButtonVisible: true,
				busy: true,
				exitFSButtonVisible: false,
				fromDate: FirstDay,
				toDate: date,
				Plant: "MIL - LIGHTING MANESAR(1031)",
				VendorCode: "0000200323",
				mPBVisible: true,
				felxBoxVisible: false,
				tableColumns: ["MATERIAL CODE", "MATERIAL NAME", "PLANT CODE", "ORDER ID", "TOTAL REQD.", "PENDING QTY."]
			}), "detailViewModel");
			if (this._product == "all") {
				this.getView().getModel("detailViewModel").setProperty("/detailViewTitle", "All Orders");
				var filter = [];
				filter.push(new sap.ui.model.Filter("VendorId", sap.ui.model.FilterOperator.EQ, '0000200323'));
				filter.push(new sap.ui.model.Filter("Plant", sap.ui.model.FilterOperator.EQ, "1031"));
				filter.push(new sap.ui.model.Filter("DeliveryDate", sap.ui.model.FilterOperator.BT, this.getView().getModel("detailViewModel").getProperty(
					"/fromDate"), this.getView().getModel("detailViewModel").getProperty("/toDate")));
				this._getDeliveryScheduleData(filter);
			} else {
				this.getView().getModel("detailViewModel").setProperty("/mPBVisible", false);
				this.getView().getModel("detailViewModel").setProperty("/felxBoxVisible", true);
				this._getDetailViewData();
			}

		},
		handleDateRangeChange: function (oEvent) {
			var Difference_In_Time = oEvent.getSource().getSecondDateValue().getTime() - oEvent.getSource().getDateValue().getTime();
			var Difference_In_Days = Difference_In_Time / (1000 * 3600 * 24);
			if (Difference_In_Days > 31) {
				return MessageToast.show("Can not select more than 31 days...");
			}
			this.getView().getModel("detailViewModel").setProperty("/busy", true);
			var filter = [];
			filter.push(new sap.ui.model.Filter("VendorId", sap.ui.model.FilterOperator.EQ, '0000200323'));
			filter.push(new sap.ui.model.Filter("Plant", sap.ui.model.FilterOperator.EQ, "1031"));
			filter.push(new sap.ui.model.Filter("DeliveryDate", sap.ui.model.FilterOperator.BT, oEvent.getSource().getDateValue(), oEvent.getSource()
				.getSecondDateValue()));
			if (this._product != "all") {
				filter.push(new sap.ui.model.Filter("AgreementId", sap.ui.model.FilterOperator.EQ, this._product));
			}
			this._getDeliveryScheduleData(filter);
		},
		_getDeliveryScheduleData: function (filter) {
			this.getOwnerComponent().getModel().metadataLoaded().then(function () {
				this.getOwnerComponent().getModel("calenderService").read("/CalendarSet", {
					urlParameters: {
						'$expand': 'Columns'
					},
					filters: filter,
					success: function (oData) {
						debugger;
						if (oData.results[0].MaterialCode == "") {
							this.getView().getModel("detailViewModel").setProperty("/items", []);
							this.getView().getModel("detailViewModel").setProperty("/tableTitle", "Orders (0)");
						} else {
							var columns = this.getView().getModel("detailViewModel").getProperty("/tableColumns");
							for (var i = 0; i < oData.results.length; i++) {
								oData.results[i].PlantCode = '1031';
								oData.results[i].OrderId = this._product;
								for (var j = 0; j < oData.results[i].Columns.results.length; j++) {
									oData.results[i][oData.results[i].Columns.results[j].Header] = oData.results[i].Columns.results[j].TotalQty;
								}
							}
							var cells = [
								new sap.m.Text({
									text: '{detailViewModel>MaterialCode}'
								}),
								new sap.m.Text({
									text: '{detailViewModel>MaterialName}'
								}),
								new sap.m.Text({
									text: '{detailViewModel>PlantCode}'
								}),
								new sap.m.Text({
									text: ''
								}),
								new sap.m.Text({
									text: '{detailViewModel>ScheduledQuantity}'
								}),
								new sap.m.Text({
									text: '{detailViewModel>PendingQty}'
								})
							];
							for (var j = 0; j < oData.results[0].Columns.results.length; j++) {
								columns.push(oData.results[0].Columns.results[j].Header);
								cells.push(new sap.m.Text({
									text: "{detailViewModel>" + oData.results[0].Columns.results[j].Header + "}"
								}))
							}
							var template = new sap.m.ColumnListItem({
								cells: cells
							});
							this.getView().getModel("detailViewModel").getProperty("/tableWidth", "400%");
							this.getView().getModel("detailViewModel").setProperty("/items", oData.results);
							this.getView().getModel("detailViewModel").setProperty("/tableTitle", "Orders (" + oData.results.length + ")");
							this.byId("table").bindItems("detailViewModel>/items", template);
							this.byId("table").setWidth("800%");
						}

						this.getView().getModel("detailViewModel").setProperty("/Plant", "MIL - LIGHTING MANESAR(1031)");
						this.getView().getModel("detailViewModel").setProperty("/busy", false);
					}.bind(this),
					error: function (oError) {

					}.bind(this)
				});

			}.bind(this));
		},
		_getDetailViewData: function () {
			this.getOwnerComponent().getModel().metadataLoaded().then(function () {
				this.getOwnerComponent().getModel().read("/SchAgrHeaderSet('" + this._product + "')", {
					urlParameters: {
						"$expand": 'items,items/ItemCond,conditions'
					},
					success: function (oData) {
						for (var key in oData) {
							this.getView().getModel("detailViewModel").setProperty("/" + key, oData[key]);
						}
						this.getView().getModel("detailViewModel").setProperty("/AgreementNo", this._product);
						this.getView().getModel("detailViewModel").setProperty("/detailViewTitle", "Order Id: " + this._product);
						this.getView().getModel("detailViewModel").setProperty("/Plant", "MIL - LIGHTING MANESAR(1031)");
						var filter = [];
						filter.push(new sap.ui.model.Filter("VendorId", sap.ui.model.FilterOperator.EQ, '0000200323'));
						filter.push(new sap.ui.model.Filter("Plant", sap.ui.model.FilterOperator.EQ, "1031"));
						filter.push(new sap.ui.model.Filter("DeliveryDate", sap.ui.model.FilterOperator.BT, this.getView().getModel(
							"detailViewModel").getProperty(
							"/fromDate"), this.getView().getModel("detailViewModel").getProperty("/toDate")));
						this._getDeliveryScheduleData(filter);
					}.bind(this),
					error: function (oError) {

					}.bind(this)
				});

			}.bind(this));
		},
		onMaterialCodeSearch: function (oEvent) {
			var oTableSearchState = [],
				sQuery = oEvent.getParameter("newValue");
			if (sQuery && sQuery.length > 0) {
				oTableSearchState = [new Filter("MaterialCode", FilterOperator.Contains, sQuery)];
			}
			this.getView().byId("table").getBinding("items").filter(oTableSearchState, "Application");
		},
		onMaterialNameSearch: function (oEvent) {
			var oTableSearchState = [],
				sQuery = oEvent.getParameter("newValue");
			if (sQuery && sQuery.length > 0) {
				oTableSearchState = [new Filter("MaterialName", FilterOperator.Contains, sQuery)];
			}
			this.getView().byId("table").getBinding("items").filter(oTableSearchState, "Application");
		},
		onPressDownload: function () {
			var aColm = [{
				label: "MATERIAL CODE",
				property: "MaterialCode",
				type: "string"
			}, {
				label: "MATERIAL NAME",
				property: "MaterialName",
				type: "string"
			}, {
				label: "PLANT CODE",
				property: "PlantCode",
				type: "string"
			}, {
				label: "ORDER ID",
				property: "",
				type: "string"
			}, {
				label: "TOTAL REQD.",
				property: "ScheduledQuantity",
				type: "string"
			}, {
				label: "PENDING QTY.",
				property: "PendingQty",
				type: "string"
			}];
			for (var i = 0; i < this.getView().getModel("detailViewModel").getData().items[0].Columns.results.length; i++) {
				var obj = {
					label: this.formatter.setColumnLabel(this.getView().getModel("detailViewModel").getData().items[0].Columns.results[i].Header),
					property: this.getView().getModel("detailViewModel").getData().items[0].Columns.results[i].Header,
					type: "string"
				};
				aColm.push(obj);
			}

			var dataResults = "";

			var oSettings = {
				workbook: {
					columns: aColm,
					hierarchyLevel: 'Level'
				},
				fileName: "Forecast",
				dataSource: this.getView().getModel("detailViewModel").getData().items

			};

			var oSheet = new Spreadsheet(oSettings);
			oSheet.build()
				.then(function () {
					MessageToast.show('Spreadsheet export has finished');
				})
				.finally(function () {
					oSheet.cancel();
				});
		},
		onPressDownloadMonthlySchedule: function () {
			var date = new Date(),
				nextDate = new Date();
			nextDate.setDate(nextDate.getDate() + 1);
			var url = "/sap/opu/odata/sap/ZGW_MATERIAL_FORECAST_SRV/MaterialForecastSet(Vendor='" + this.getOwnerComponent().getModel(
					"listViewModel").getProperty("/VendorId") +
				"',Material='',Plant='1031',SupplyingPlant='',CurrentDate=datetime'" + date.toISOString().split("T")[0].concat("T00:00:00") +
				"',ToCurrentDate=datetime'" + nextDate.toISOString().split("T")[0].concat("T00:00:00") +
				"',Daily='X',Weekly='',monthly='')/$value";
			sap.m.URLHelper.redirect(url, true);
		},
		onPressMonthlyProcurementPress: function () {
			var url =
				"/sap/opu/odata/sap/ZGW_MATERIAL_FORECAST_SRV/MaterialForecastSet(Vendor='" + this.getView().getModel("detailViewModel").getProperty(
					"/VendorCode") +
				"',Material='',Plant='1031',SupplyingPlant='',CurrentDate=datetime'" + this.getView().getModel("detailViewModel").getProperty(
					"/toDate").toISOString().split("T")[0].concat("T00:00:00") +
				"',ToCurrentDate=datetime'" + this.getView().getModel("detailViewModel").getProperty(
					"/nextMonthDate").toISOString().split("T")[0].concat("T00:00:00") + "',Daily='X',Weekly='',monthly='')/$value";
			sap.m.URLHelper.redirect(url, true);
		}

	});

});