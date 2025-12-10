package de.byedev.dsatable2.dsa_table_backend.web.dto;

public class SavedMapRequest {
    private String name;
    private String dataParam;

    public SavedMapRequest() {
    }

    public SavedMapRequest(String name, String dataParam) {
        this.name = name;
        this.dataParam = dataParam;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDataParam() {
        return dataParam;
    }

    public void setDataParam(String dataParam) {
        this.dataParam = dataParam;
    }
}

