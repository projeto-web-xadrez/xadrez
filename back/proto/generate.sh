#!/bin/bash

output_dir=$(echo $(cd ../ && pwd))/src/proto-generated
mkdir -p $output_dir

proto_files=$(ls | grep '\.proto$')

get_file_last_change() {
    time=0
    stat_res=$(stat -c %y $1 2>/dev/null) || stat_res=0
    if [ "$stat_res" == "0" ]; then
        return 0
    fi

    date_res=$(date -d "$stat_res" +%s%N) || date_res=0
    if [ "$date_res" == "0" ]; then
        return 0
    fi
    
    time=$date_res
}

for source_file in $proto_files; do
    get_file_last_change $source_file
    source_time=$time
    if [ "$time" == "0" ]; then
        continue
    fi

    proto_name="${source_file%.*}"
    proto_dir="$(cat $source_file | grep go_package | awk -F'"' '{print $2}')"
    proto_dir="${proto_dir#./}"

    generated_file_1="$output_dir/$proto_dir/$proto_name.pb.go"
    generated_file_2="$output_dir/$proto_dir/$proto_name"
    generated_file_2+="_grpc.pb.go"

    get_file_last_change $generated_file_1
    t1=$time
    get_file_last_change $generated_file_2
    t2=$time

    if [[ "$source_time" -ge "$t1" ]] || [[ "$source_time" -ge "$t2" ]]; then
        echo "Building $source_file"
        
        protoc --go_out=$output_dir  --go-grpc_out=$output_dir -I. $source_file
        continue
    fi
    
    echo "File $source_file already up to date"
done
