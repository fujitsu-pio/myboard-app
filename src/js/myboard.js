var mb = {};

mb.msgData = null;

const APP_URL = "https://demo.personium.io/app-myboard/";

getNamesapces = function() {
    return ['common', 'glossary'];
};

getAppReadRelation = function() {
    return 'MyBoardReader';
}

getAppDataPath = function() {
    return '/MyBoardBox/my-board.json';
}

additionalCallback = function() {
    Common.setAppCellUrl();

    Common.setAccessData();

    if (!Common.checkParam()) {
        // cannot do anything to recover
        // display a dialog and close the app.
        return;
    };

    Common.getAppDataAPI(Common.getTargetUrl(), Common.getToken()).done(function(data) {
        mb.msgData = JSON.parse(data);
        if (mb.msgData.message !== undefined) {
            mb.msgData.message = mb.msgData.message.replace(/<br>/g, "\n");
        }
        $('.write_board').append(mb.msgData.message);
        $('.disp_board').css("display", "block");
        if (Common.notMe()) {
            $("#exeEditer")
                .prop("disabled", true)
                .hide();
        }

        Common.setIdleTime();

        if (!Common.notMe()) {
            // 閲覧許可状況(外部セル)
            Common.getOtherAllowedCells();
            // 閲覧許可状況
            Common.getAllowedCellList();
            // 通知
            mb.getReceiveMessage();
        }
    });

    $('#exeEditer').on('click', function () {
        $("#txtEditMyBoard").val($("#txtMyBoard").val());
        $('#modal-edit-myboard').modal('show');
    });

    $('#b-edit-myboard-ok').on('click', function () {
        mb.myboardReg();
    });

    $('#bReadAnotherCell').on('click', function () {
        var value = $("#otherAllowedCells option:selected").val();
        var childWindow = window.open('about:blank');
        $.ajax({
            type: "GET",
            url: Common.getAppCellUrl() + "__/launch.json",
            headers: {
                'Authorization':'Bearer ' + Common.getToken(),
                'Accept':'application/json'
            }
        }).done(function(data) {
            var launchObj = data.personal;
            var launch = launchObj.web;
            var target = value + Common.getBoxName();
            Common.getTargetToken(value).done(function(extData) {
                var url = launch;
                url += '#target=' + target;
                url += '&token=' + extData.access_token;
                url += '&ref=' + extData.refresh_token;
                url += '&expires=' + extData.expires_in;
                url += '&refexpires=' + extData.refresh_token_expires_in;
                url += '&fromCell=' + Common.getCellName();
                childWindow.location.href = url;
                childWindow = null;
            });
        }).fail(function(data) {
            childWindow.close();
            childWindow = null;
        });
    });

    $('#bSendAllowed').on('click', function () {
        var value = $("#requestCells option:selected").val();
        var title = i18next.t("readRequestTitle");
        var body = i18next.t("readRequestBody");
        var reqRel = [
            Common.getAppCellUrl(),
            "__relation/__/",
            getAppReadRelation()
        ].join("");
        Common.sendMessageAPI(null, value, "req.relation.build", title, body, reqRel, Common.getCellUrl()).done(function(data) {
            $("#popupSendAllowedErrorMsg").html(i18next.t("msg.info.messageSent"));
        }).fail(function(data) {
            $("#popupSendAllowedErrorMsg").html(i18next.t("msg.error.failedToSendMessage"));
        });
    });

    $("#extCellMyBoard").on('show.bs.collapse', function() {
        $("#sendAllowedMessage").removeClass('in');
        $("#sendAllowedMessage").attr("aria-expanded", false);
        $("#listAllowed").removeClass('in');
        $("#listAllowed").attr("aria-expanded", false);
        $("#receiveMessage").removeClass('in');
        $("#receiveMessage").attr("aria-expanded", false);
        $("#popupReadAllowedErrorMsg").empty();
    });
    $("#sendAllowedMessage").on('show.bs.collapse', function() {
        $("#extCellMyBoard").removeClass('in');
        $("#extCellMyBoard").attr("aria-expanded", false);
        $("#listAllowed").removeClass('in');
        $("#listAllowed").attr("aria-expanded", false);
        $("#receiveMessage").removeClass('in');
        $("#receiveMessage").attr("aria-expanded", false);
        $("#popupSendAllowedErrorMsg").empty();
    });
    $("#listAllowed").on('show.bs.collapse', function() {
        $("#sendAllowedMessage").removeClass('in');
        $("#sendAllowedMessage").attr("aria-expanded", false);
        $("#extCellMyBoard").removeClass('in');
        $("#extCellMyBoard").attr("aria-expanded", false);
        $("#receiveMessage").removeClass('in');
        $("#receiveMessage").attr("aria-expanded", false);
    });
    $("#receiveMessage").on('show.bs.collapse', function() {
        $("#sendAllowedMessage").removeClass('in');
        $("#sendAllowedMessage").attr("aria-expanded", false);
        $("#listAllowed").removeClass('in');
        $("#listAllowed").attr("aria-expanded", false);
        $("#extCellMyBoard").removeClass('in');
        $("#extCellMyBoard").attr("aria-expanded", false);
    });
};

irrecoverableErrorHandler = function() {
    $("#collapse-id").empty();
    $("#exeEditer").prop("disabled", true);
};

mb.getReceiveMessage = function() {
    $("#messageList").empty();
    mb.getReceivedMessageAPI().done(function(data) {
        var results = data.d.results;
        for (var i in results) {
            var title = results[i].Title;
            var body = results[i].Body;
            var fromCell = results[i].From;
            var uuid = results[i].__id;

            if (results[i].Status !== "approved" && results[i].Status !== "rejected") {
                var html = '<div class="panel panel-default" id="recMsgParent' + i + '"><div class="panel-heading"><h4 class="panel-title accordion-togle"><a data-toggle="collapse" data-parent="#accordion" href="#recMsg' + i + '" class="allToggle collapsed">' + Common.getCellNameFromUrl(fromCell) + ':[' + title + ']</a></h4></div><div id="recMsg' + i + '" class="panel-collapse collapse"><div class="panel-body">';
                if (results[i].Type === "message") {
                    html += '<table class="display-table"><tr><td width="80%">' + body + '</td></tr></table>';
                } else {
                    html += '<table class="display-table"><tr><td width="80%">' + body + '</td>';
                    html += '<td width="10%"><button onClick="Common.approvalRel(\'' + fromCell + '\', \'' + uuid + '\', \'recMsgParent' + i + '\');">'+ i18next.t("btn.approve") + '</button></td>';
                    html += '<td width="10%"><button onClick="Common.rejectionRel(\'' + fromCell + '\', \'' + uuid + '\', \'recMsgParent' + i + '\');">'+ i18next.t("btn.decline") + '</button></td>';
                    html += '</tr></table>';
                }
                html += '</div></div></div>';

                $("#messageList").append(html);
            }
        }
    });
};

mb.myboardReg = function() {
    var strTxt = $("#txtEditMyBoard").val();
    mb.msgData.message = strTxt.replace(/\n/g, "<br>");
    json = {
        "message" : mb.msgData.message
    };
    $.ajax({
        type: "PUT",
        url: Common.getTargetUrl() + '/MyBoardBox/my-board.json',
        data: JSON.stringify(json),
        dataType: 'json',
        headers: {
            'Authorization':'Bearer ' + Common.getToken(),
            'Accept':'application/json'
        }
    }).done(function() {
        $("#txtMyBoard").val(strTxt);
        $('#modal-edit-myboard').modal('hide');
    }).fail(function(data) {
        var status = data.status;
        if (status == 403) {
            Common.displayMessageByKey("glossary:msg.error.noWritePermission");
        } else {
            Common.displayMessageByKey("glossary:msg.error.failedToWrite");
        }
        $('#modal-edit-myboard').modal('hide');
    });
};

mb.getReceivedMessageAPI = function() {
    return $.ajax({
        type: "GET",
        url: Common.getCellUrl() + '__ctl/ReceivedMessage?$filter=startswith%28Title,%27MyBoard%27%29&$orderby=__published%20desc',
        headers: {
            'Authorization':'Bearer ' + Common.getToken(),
            'Accept':'application/json'
        }
    });
};
