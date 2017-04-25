class MyTestCase extends ImpTestCase {
    function testMe() {
@include __PATH__+"/myfile.nut";
@include __PATH__+"/../myfile.nut";
        local myVar = "LINE = @{__LINE__}";
        local myVar = "FILE = @{__FILE__}";
        local myVar = "GGG = #{env:GGG}";
        return Promise(function(ok, err) {
          ok();
        });
    }
}
