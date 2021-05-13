export async function handle(event) {
    return {
        statusCode:201,
        body:JSON.stringify({
            message:"Hello world"
        }),
        headers:{
            "Content-Type":"application/json"
        }
    }
}